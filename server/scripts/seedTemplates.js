const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Template = require("../models/Template");

const TEMPLATES = [
  {
    title: "Employment Agreement",
    content: `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

Employer: {{company_name}}, located at {{company_address}}
Employee: {{employee_name}}, residing at {{employee_address}}

1. POSITION AND DUTIES
The Employer hereby employs the Employee as {{job_title}}. The Employee shall perform duties as assigned by the Employer and shall report to {{supervisor_name}}.

2. COMPENSATION
The Employee shall receive a salary of {{salary_amount}} per {{pay_period}}, subject to applicable withholdings and deductions.

3. START DATE
The Employee's start date shall be {{start_date}}.

4. WORK SCHEDULE
The Employee shall work {{work_hours}} hours per week, {{work_schedule}}.

5. BENEFITS
The Employee shall be eligible for the following benefits: {{benefits_description}}.

6. TERMINATION
Either party may terminate this Agreement with {{notice_period}} written notice.

7. CONFIDENTIALITY
The Employee agrees to maintain the confidentiality of all proprietary information during and after employment.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

Employer Signature: ___________________________
Employee Signature: ___________________________`,
  },
  {
    title: "Non-Disclosure Agreement (NDA)",
    content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is made effective as of {{effective_date}} between:

Disclosing Party: {{disclosing_party_name}}
Receiving Party: {{receiving_party_name}}

1. PURPOSE
The Disclosing Party wishes to share certain confidential information with the Receiving Party for the purpose of {{purpose}}.

2. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any data or information, oral or written, that is disclosed by the Disclosing Party including but not limited to: business plans, technical data, trade secrets, customer lists, financial information, and {{additional_categories}}.

3. OBLIGATIONS
The Receiving Party agrees to:
- Hold all Confidential Information in strict confidence
- Not disclose Confidential Information to any third parties without prior written consent
- Use the Confidential Information solely for the stated purpose

4. DURATION
This Agreement shall remain in effect for {{duration}} from the effective date.

5. RETURN OF INFORMATION
Upon termination, the Receiving Party shall return or destroy all Confidential Information.

6. GOVERNING LAW
This Agreement shall be governed by the laws of {{governing_law_jurisdiction}}.

Disclosing Party Signature: ___________________________
Receiving Party Signature: ___________________________`,
  },
  {
    title: "Invoice",
    content: `INVOICE

Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}

FROM:
{{sender_name}}
{{sender_address}}
{{sender_email}}

BILL TO:
{{client_name}}
{{client_address}}
{{client_email}}

DESCRIPTION OF SERVICES:
{{service_description}}

Amount: {{currency}} {{amount}}
Tax ({{tax_rate}}%): {{currency}} {{tax_amount}}
---
TOTAL DUE: {{currency}} {{total_amount}}

PAYMENT TERMS:
Please make payment by {{due_date}} via {{payment_method}}.

NOTES:
{{additional_notes}}

Thank you for your business!`,
  },
  {
    title: "Rental / Lease Agreement",
    content: `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is entered into on {{agreement_date}} between:

Landlord: {{landlord_name}}, ("Landlord")
Tenant: {{tenant_name}}, ("Tenant")

PROPERTY ADDRESS: {{property_address}}

1. LEASE TERM
The lease shall commence on {{lease_start_date}} and end on {{lease_end_date}}.

2. MONTHLY RENT
The Tenant agrees to pay {{currency}} {{monthly_rent}} per month, due on the {{rent_due_day}} of each month.

3. SECURITY DEPOSIT
The Tenant shall pay a security deposit of {{currency}} {{security_deposit}} upon signing this Agreement.

4. UTILITIES
The following utilities are included: {{included_utilities}}.
The Tenant is responsible for: {{tenant_utilities}}.

5. MAINTENANCE
The Landlord shall maintain the property in habitable condition. The Tenant shall keep the premises clean and report any damage promptly.

6. TERMINATION
Either party must provide {{notice_period}} written notice before terminating the lease.

7. RULES AND REGULATIONS
{{additional_rules}}

Landlord Signature: ___________________________
Tenant Signature: ___________________________`,
  },
  {
    title: "Certificate of Completion",
    content: `CERTIFICATE OF COMPLETION

This is to certify that

{{recipient_name}}

has successfully completed the

{{course_name}}

conducted by {{organization_name}}

Date of Completion: {{completion_date}}
Duration: {{course_duration}}
Grade/Score: {{grade}}

{{additional_remarks}}

Authorized Signature: ___________________________
Name: {{authorizer_name}}
Title: {{authorizer_title}}
Date: {{issue_date}}`,
  },
  {
    title: "Letter of Recommendation",
    content: `LETTER OF RECOMMENDATION

Date: {{date}}

To Whom It May Concern,

I am writing to recommend {{candidate_name}} for {{position_or_program}}. I have had the pleasure of working with {{candidate_name}} for {{duration}} in my capacity as {{your_title}} at {{organization_name}}.

During this time, {{candidate_name}} demonstrated exceptional skills in {{key_skills}}. Their contributions to {{specific_project_or_task}} were particularly noteworthy.

{{candidate_name}} consistently displayed {{positive_qualities}} and was highly regarded by colleagues and supervisors alike.

I am confident that {{candidate_name}} will be an excellent addition to your {{team_or_program}}. I give my highest recommendation without reservation.

Please feel free to contact me at {{your_email}} or {{your_phone}} for further information.

Sincerely,

{{your_name}}
{{your_title}}
{{organization_name}}`,
  },
];

const extractPlaceholders = (content) => {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{|\}/g, "")))];
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const existing = await Template.countDocuments();
    if (existing > 0) {
      console.log(`${existing} templates already exist. Skipping seed.`);
      process.exit(0);
    }

    const templatesWithMeta = TEMPLATES.map((t) => ({
      ...t,
      placeholders: extractPlaceholders(t.content),
      createdBy: new mongoose.Types.ObjectId(), // placeholder — will be first admin
      isActive: true,
    }));

    await Template.insertMany(templatesWithMeta);
    console.log(`Seeded ${templatesWithMeta.length} templates successfully!`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
