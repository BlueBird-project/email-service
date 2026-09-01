const { z } = require('zod');

const recommendationTypes = [
  'setpoint_adjustment',
  'charge_storage',
  'load_shift',
  'other'
];

const fmOutputSchema = z.object({
  pilot_id: z.literal('bluebird'),
  message_id: z.string().min(1),
  timestamp_utc: z.string().datetime({ offset: true }),
  severity: z.enum(['info', 'warning', 'critical']),
  fm_recommendation_type: z.enum(recommendationTypes),
  title: z.string().min(3).max(140),
  description: z.string().min(5),
  valid_from_utc: z.string().datetime({ offset: true }),
  valid_to_utc: z.string().datetime({ offset: true }),
  constraints_summary: z.string().min(5),
  requested_by: z.string().min(1),
  // Send to a single address for technical testing (address is never logged).
  test_recipient_email: z.string().email().optional(),
  // When true, the notification is sent to the stored Karno recipient list.
  use_karno_list: z.boolean().optional(),
  // ID of a stored email template to use as subject and body.
  template_id: z.string().uuid().optional(),
  metadata: z.object({
    asset_group: z.string().min(1),
    estimated_flex_kwh: z.number().nonnegative()
  }).optional()
}).refine((data) => {
  return new Date(data.valid_from_utc).getTime() < new Date(data.valid_to_utc).getTime();
}, {
  message: 'valid_from_utc must be earlier than valid_to_utc',
  path: ['valid_from_utc']
});

function validateFmOutput(payload) {
  return fmOutputSchema.safeParse(payload);
}

module.exports = {
  validateFmOutput
};
