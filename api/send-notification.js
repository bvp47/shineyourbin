import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const timeSlots = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM"
];

const addonOptions = [
  { label: "Deodorizer Spray ($2)", value: "deodorizer", price: 2 },
  { label: "Recycle Bin Cleaning ($5)", value: "recycle-bin", price: 5 }
];

const planPrices = {
  "one-time": 10.00
};

const paymentMethods = [
  { value: "cash", label: "Cash", description: "Paid at time of service" },
  { value: "card", label: "Credit/Debit Card", description: "Invoice will be sent upon completion of service" },
  { value: "venmo", label: "Venmo", description: "Invoice will be sent upon completion of service" },
  { value: "apple-pay", label: "Apple Pay", description: "Invoice will be sent upon completion of service" }
];

// Simple Button component
const Button = ({ children, variant = "default", className = "", type = "button", disabled = false, ...props }) => {
  const baseClasses = "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    default: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
  };
  
  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Simple Input component
const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${className}`}
      {...props}
    />
  );
};

// Simple Card components
const Card = ({ children, className = "" }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

const CardContent = ({ children, className = "" }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

// Simple DatePicker component
const DatePicker = ({ selected, onChange, className = "", placeholderText, required }) => {
  return (
    <input
      type="date"
      value={selected ? selected.toISOString().split('T')[0] : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${className}`}
      placeholder={placeholderText}
      required={required}
    />
  );
};

export default function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    plan: "",
    binQuantity: 1,
    date: null,
    timeSlot: "",
    addons: [],
    paymentMethod: ""
  });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [bookedSlots, setBookedSlots] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    // Load booked slots from Supabase
    loadBookedSlots();
  }, []);

  useEffect(() => {
    let total = 0;
    if (form.plan && planPrices[form.plan]) {
      total += planPrices[form.plan] * form.binQuantity; // Multiply by bin quantity
    }
    form.addons.forEach((addon) => {
      const match = addonOptions.find((opt) => opt.value === addon);
      if (match) total += match.price;
    });
    setTotalPrice(total);
  }, [form.plan, form.addons, form.binQuantity]); // Add binQuantity dependency

  const loadBookedSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('date, time_slot')
        .eq('status', 'confirmed');

      if (error) throw error;

      // Group bookings by date
      const slots = {};
      data.forEach(booking => {
        const dateStr = booking.date;
        if (!slots[dateStr]) slots[dateStr] = [];
        slots[dateStr].push(booking.time_slot);
      });

      setBookedSlots(slots);
    } catch (error) {
      console.error('Error loading booked slots:', error);
      // Fallback to static data
      setBookedSlots({
        "2025-07-12": ["10:00 AM - 12:00 PM"],
        "2025-07-13": ["8:00 AM - 10:00 AM", "2:00 PM - 4:00 PM"]
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "addons") {
      setForm((prev) => {
        const updated = checked
          ? [...prev.addons, value]
          : prev.addons.filter((v) => v !== value);
        return { ...prev, addons: updated };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      if (name === "address" && value.length > 2) {
        // Search only Missouri addresses
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}, Missouri&countrycodes=us&limit=5&addressdetails=1`
        )
          .then((res) => res.json())
          .then((data) => {
            // Filter to only show Missouri addresses
            const moAddresses = data.filter(item => 
              item.address && 
              (item.address.state === 'Missouri' || 
               item.address.state === 'MO' ||
               item.display_name.includes('Missouri') ||
               item.display_name.includes(', MO,'))
            );
            setAddressSuggestions(moAddresses.slice(0, 5));
          })
          .catch(() => setAddressSuggestions([]));
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setForm((prev) => ({ ...prev, address: suggestion.display_name }));
    setAddressSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      // Insert booking into Supabase
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            name: form.name,
            email: form.email,
            address: form.address,
            plan: form.plan,
            bin_quantity: form.binQuantity,
            date: form.date.toISOString().split('T')[0],
            time_slot: form.timeSlot,
            addons: form.addons,
            total_price: totalPrice,
            payment_method: form.paymentMethod,
            status: 'pending'
          }
        ])
        .select();

      if (error) throw error;

      // Send email notification to you
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingData: {
              ...data[0],
              payment_method: form.paymentMethod,
              bin_quantity: form.binQuantity
            }
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the booking if email fails
      }

      setSubmitMessage("🎉 Booking submitted successfully! We'll contact you soon to confirm your cleaning appointment.");
      
      // Reset form
      setForm({
        name: "",
        email: "",
        address: "",
        plan: "",
        binQuantity: 1,
        date: null,
        timeSlot: "",
        addons: [],
        paymentMethod: ""
      });

      // Reload booked slots
      loadBookedSlots();

    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitMessage("❌ Sorry, there was an error submitting your booking. Please try again or contact us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSlotDisabled = (slot) => {
    if (!form.date) return false;
    const day = form.date.toISOString().split("T")[0];
    return bookedSlots[day]?.includes(slot);
  };

  const getPaymentDescription = () => {
    const method = paymentMethods.find(pm => pm.value === form.paymentMethod);
    return method ? method.description : "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white text-gray-900 font-sans">
      <header className="p-6 border-b bg-white shadow flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-green-700 tracking-wide">ShineYourBin</h1>
        <Button variant="outline" className="rounded-full px-4 py-1 text-sm">Login</Button>
      </header>

      <section className="px-6 py-16 max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-bold mb-4 leading-tight text-green-800">Trash Bin Cleaning Service</h2>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Hassle-free one-time or recurring trash can cleanings. Book your cleaning online in minutes.
        </p>

        <Card className="text-left max-w-xl mx-auto shadow-xl">
          <CardContent className="p-8 space-y-5">
            {submitMessage && (
              <div className={`p-4 rounded-md ${submitMessage.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                {submitMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              <Input name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} required />
              <div className="relative">
                <Input name="address" placeholder="Street Address (Missouri only)" value={form.address} onChange={handleChange} required />
                {addressSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full border mt-1 rounded shadow bg-white text-sm max-h-40 overflow-y-auto">
                    {addressSuggestions.map((s, idx) => (
                      <li key={idx} className="p-2 hover:bg-green-100 cursor-pointer" onClick={() => handleSuggestionClick(s)}>
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select Service</option>
                <option value="one-time">Trash Bin Cleaning Service</option>
              </select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Bins</label>
                <select
                  name="binQuantity"
                  value={form.binQuantity}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={1}>1 Bin - $10.00</option>
                  <option value={2}>2 Bins - $20.00</option>
                  <option value={3}>3 Bins - $30.00</option>
                  <option value={4}>4 Bins - $40.00</option>
                  <option value={5}>5 Bins - $50.00</option>
                  <option value={6}>6 Bins - $60.00</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Cleaning Date</label>
                <DatePicker
                  selected={form.date}
                  onChange={(date) => setForm((prev) => ({ ...prev, date }))}
                  className="w-full p-2 border rounded-md"
                  placeholderText="Choose a date"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time Slot</label>
                <select
                  name="timeSlot"
                  value={form.timeSlot}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a Time Slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot} disabled={isSlotDisabled(slot)}>
                      {slot} {isSlotDisabled(slot) ? "(Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add-On Services</label>
                <div className="space-y-2">
                  {addonOptions.map(({ label, value }) => (
                    <label key={value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="addons"
                        value={value}
                        checked={form.addons.includes(value)}
                        onChange={handleChange}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="space-y-3">
                  {paymentMethods.map(({ value, label, description }) => (
                    <label key={value} className="flex items-start space-x-3 cursor-pointer p-3 border rounded-md hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={value}
                        checked={form.paymentMethod === value}
                        onChange={handleChange}
                        required
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{label}</div>
                        <div className="text-sm text-gray-600">{description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="text-right text-lg font-semibold text-green-700 pt-4 border-t">
                <div>
                  {form.plan && form.binQuantity > 0 && (
                    <div className="text-sm text-gray-600 mb-1">
                      {form.binQuantity} bin{form.binQuantity > 1 ? 's' : ''} × $10.00 = ${(form.binQuantity * 10).toFixed(2)}
                    </div>
                  )}
                  Total: ${totalPrice.toFixed(2)}
                </div>
                {form.paymentMethod && (
                  <div className="text-sm text-gray-600 mt-1">
                    {getPaymentDescription()}
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 rounded-md"
              >
                {isSubmitting ? "Submitting..." : "Confirm Booking"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="bg-green-100 py-12 text-center">
        <h3 className="text-xl font-bold mb-2">Professional Trash Bin Cleaning</h3>
        <p className="text-gray-700 mb-4 max-w-xl mx-auto">
          We clean your trash bins so you don't have to. Fresh, sanitized bins delivered to your curb.
        </p>
        <Button variant="default" className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 text-sm rounded-full">
          Book Your Cleaning
        </Button>
      </section>

      <footer className="text-center text-sm text-gray-500 py-6">
        © {new Date().getFullYear()} ShineYourBin. All rights reserved.
      </footer>
    </div>
  );
}
