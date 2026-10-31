// Key = Recipient blood group, Value = Array of compatible Donor blood groups
export const RECIPIENT_COMPATIBLE_DONORS = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

// Key = Donor blood group, Value = Array of Recipient blood groups they can donate to
export const DONOR_COMPATIBLE_RECIPIENTS = {
  "A+": ["A+", "AB+"],
  "A-": ["A+", "A-", "AB+", "AB-"],
  "B+": ["B+", "AB+"],
  "B-": ["B+", "B-", "AB+", "AB-"],
  "AB+": ["AB+"],
  "AB-": ["AB+", "AB-"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "O-": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
};

export function getCompatibleDonorGroups(recipientBloodGroup) {
  return RECIPIENT_COMPATIBLE_DONORS[recipientBloodGroup] || [];
}

export function getCompatibleRecipientGroups(donorBloodGroup) {
  return DONOR_COMPATIBLE_RECIPIENTS[donorBloodGroup] || [];
}