import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

export interface GoogleDriveFormItem {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleFormQuestion {
  title: string;
  type: 'TEXT' | 'RADIO' | 'CHECKBOX';
  options?: string[];
  required?: boolean;
}

export interface GoogleFormDetails {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  responderUri?: string;
  items?: Array<{
    itemId: string;
    title: string;
    description?: string;
    questionItem?: {
      question: {
        questionId: string;
        required?: boolean;
        choiceQuestion?: {
          type: string;
          options: Array<{ value: string }>;
        };
        textQuestion?: {
          paragraph?: boolean;
        };
      };
    };
  }>;
}

export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers?: Record<string, {
    questionId: string;
    textAnswers?: {
      answers: Array<{ value: string }>;
    };
  }>;
}

/**
 * List all Google Forms owned or accessible by the user via Drive v3.
 */
export async function listUserGoogleForms(accessToken: string): Promise<GoogleDriveFormItem[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.form' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime%20desc&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to list forms from Google Drive: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  return (data.files || []) as GoogleDriveFormItem[];
}

/**
 * Fetch detailed form configuration (questions, settings, responder URL).
 */
export async function getGoogleFormDetails(formId: string, accessToken: string): Promise<GoogleFormDetails> {
  const safeFormId = encodeURIComponent(formId.trim());
  const url = `https://forms.googleapis.com/v1/forms/${safeFormId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to load Google Form details: ${res.status} ${errorBody}`);
  }

  return (await res.json()) as GoogleFormDetails;
}

/**
 * Fetch submitted responses for a Google Form.
 */
export async function getGoogleFormResponses(formId: string, accessToken: string): Promise<GoogleFormResponse[]> {
  const safeFormId = encodeURIComponent(formId.trim());
  const url = `https://forms.googleapis.com/v1/forms/${safeFormId}/responses`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to load form responses: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  return (data.responses || []) as GoogleFormResponse[];
}

/**
 * Creates a brand new Google Form with predefined questions and stores the link in Firestore.
 */
export async function createGoogleForm(
  title: string,
  description: string,
  questions: GoogleFormQuestion[],
  accessToken: string,
  userId?: string
): Promise<GoogleFormDetails> {
  // Step 1: Create initial form resource
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: title.trim().slice(0, 200),
        documentTitle: title.trim().slice(0, 200),
      },
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Form: ${createRes.status} ${errorText}`);
  }

  const createdForm = (await createRes.json()) as GoogleFormDetails;
  const formId = createdForm.formId;

  // Step 2: Batch update to add description and questions
  if (questions.length > 0 || description) {
    const requests: any[] = [];

    if (description) {
      requests.push({
        updateFormInfo: {
          info: {
            description: description.slice(0, 500),
          },
          updateMask: 'description',
        },
      });
    }

    questions.forEach((q, index) => {
      if (q.type === 'RADIO' || q.type === 'CHECKBOX') {
        requests.push({
          createItem: {
            item: {
              title: q.title.slice(0, 200),
              questionItem: {
                question: {
                  required: Boolean(q.required),
                  choiceQuestion: {
                    type: q.type,
                    options: (q.options || ['Yes', 'No']).map((opt) => ({ value: opt.slice(0, 100) })),
                  },
                },
              },
            },
            location: { index },
          },
        });
      } else {
        // Text question
        requests.push({
          createItem: {
            item: {
              title: q.title.slice(0, 200),
              questionItem: {
                question: {
                  required: Boolean(q.required),
                  textQuestion: {
                    paragraph: true,
                  },
                },
              },
            },
            location: { index },
          },
        });
      }
    });

    const safeFormId = encodeURIComponent(formId);
    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateRes.ok) {
      console.warn('Batch update questions had warnings:', await updateRes.text());
    }
  }

  // Refresh form details to obtain responderUri
  const updatedDetails = await getGoogleFormDetails(formId, accessToken);

  // Sync reference to Firestore if user is authenticated
  if (userId) {
    const path = `users/${userId}/forms`;
    try {
      const formDocRef = doc(collection(db, path), formId);
      await setDoc(formDocRef, {
        id: formId,
        userId,
        formId,
        title: title.slice(0, 200),
        responderUri: updatedDetails.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`,
        editUri: `https://docs.google.com/forms/d/${formId}/edit`,
        description: description.slice(0, 500),
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  return updatedDetails;
}

/**
 * Permanently deletes or trashes a Google Form via Drive v3.
 * Requires explicit user confirmation dialog in the caller component.
 */
export async function deleteGoogleForm(
  formId: string,
  accessToken: string,
  userId?: string
): Promise<void> {
  const safeFormId = encodeURIComponent(formId.trim());
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${safeFormId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Failed to delete Google Form: ${res.status} ${errorText}`);
  }

  // Also remove reference from Firestore if present
  if (userId) {
    const path = `users/${userId}/forms/${formId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'forms', formId));
    } catch (err: any) {
      // Non-fatal if already absent
      console.warn('Could not delete form record from Firestore:', err?.message);
    }
  }
}

/**
 * Pre-defined AI Feedback Survey Templates for DigAI
 */
export const PREDEFINED_FORM_TEMPLATES = [
  {
    id: 'ai-news-accuracy-poll',
    title: 'DigAI Intelligence & News Accuracy Survey',
    description: 'Help evaluate the quality, depth, and relevance of today\'s AI news digests and research breakthroughs.',
    questions: [
      {
        title: 'Which AI story or model drop was the most significant today?',
        type: 'TEXT' as const,
        required: true,
      },
      {
        title: 'How would you rate the clarity and accuracy of today\'s summaries?',
        type: 'RADIO' as const,
        options: ['5 - Outstanding & Insightful', '4 - Accurate & Useful', '3 - Neutral', '2 - Needs More Depth', '1 - Inaccurate'],
        required: true,
      },
      {
        title: 'What emerging AI topics or frameworks would you like added to the digest?',
        type: 'TEXT' as const,
        required: false,
      },
    ],
  },
  {
    id: 'ai-course-learning-review',
    title: 'Free AI Course Learning Review',
    description: 'Share feedback and learning outcomes on verified free AI courses and certifications.',
    questions: [
      {
        title: 'Which verified free course did you explore or enroll in?',
        type: 'TEXT' as const,
        required: true,
      },
      {
        title: 'Did the course provide a free certificate of completion as described?',
        type: 'RADIO' as const,
        options: ['Yes, fully free certificate', 'Free audit only (certificate requires payment)', 'Haven\'t completed yet'],
        required: true,
      },
      {
        title: 'How would you rate the learning difficulty?',
        type: 'RADIO' as const,
        options: ['Beginner friendly', 'Intermediate', 'Advanced', 'Too technical'],
        required: false,
      },
      {
        title: 'Key takeaways and skills learned:',
        type: 'TEXT' as const,
        required: false,
      },
    ],
  },
];
