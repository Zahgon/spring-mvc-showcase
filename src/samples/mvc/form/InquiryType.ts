/** `enum InquiryType { comment, feedback, suggestion }`. */
export const InquiryType = ['comment', 'feedback', 'suggestion'] as const;

export type InquiryTypeValue = (typeof InquiryType)[number];
