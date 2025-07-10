import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingData } = req.body;
    
    // Send notification email to you
    const { data, error } = await resend.emails.send({
      from: 'delivered@resend.dev',
      to: process.env.OWNER_EMAIL,
      subject: `🗑️ New Booking: ${bookingData.name} - ${bookingData.address}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
            New ShineYourBin Booking!
          </h2>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin-top: 0; color: #15803d;">👤 Customer Details</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${bookingData.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${bookingData.email}" style="color: #16a34a;">${bookingData.email}</a></p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h3 style="margin-top: 0; color: #374151;">🏠 Service Details</h3>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${bookingData.address}</p>
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${bookingData.plan}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${bookingData.date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${bookingData.time_slot}</p>
            <p style="margin: 5px 0;"><strong>Add-ons:</strong> ${bookingData.addons?.length > 0 ? bookingData.addons.join(', ') : 'None'}</p>
            <p style="margin: 5px 0;"><strong>💳 Payment Method:</strong> ${bookingData.payment_method === 'cash' ? 'Cash (paid at time of service)' : 'Credit/Debit Card (invoice will be sent)'}</p>
            <p style="margin: 5px 0; font-size: 18px;"><strong>💰 Total Price: ${bookingData.total_price}</strong></p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;"><strong>📋 Next Steps:</strong></p>
            <ul style="margin: 10px 0; color: #92400e;">
              <li>Contact customer to confirm service and arrange payment</li>
              <li>Schedule your team for the appointment</li>
              <li>Update booking status in Supabase dashboard</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.supabase.com" 
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              📊 View in Supabase Dashboard
            </a>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <p>ShineYourBin Booking Notification System</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error('Email notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
