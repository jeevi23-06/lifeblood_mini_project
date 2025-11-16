❤️ LifeBlood – Blood Donation Management System

A lightweight, fully client-side blood donation management system built using HTML, CSS, and JavaScript.
LifeBlood helps connect voluntary blood donors with patients in need through smart matching, local storage data handling, and clean UI.


🚀 Features
🩸 1. Donor Registration

Register as a blood donor

Provide details: Name, age, gender, city, blood group, availability

Donor availability toggle

Data stored in browser LocalStorage

🏥 2. Blood Request Form

Submit blood request with patient details

Required blood group, city, hospital, contact

Automatic smart matching with available donors

Modal confirmation after successful request
🤝 3. Smart Matching Algorithm

Matches donors by blood group + city

Filters only currently available donors

Displays matching donor list instantly

📋 4. Donor List Page

View all registered donors

Powerful filters:

Search by name

Filter by blood group

Filter by city

Filter by availability

Contact donor directly

Toggle donor availability from the card

🧪 5. Blood Donation Eligibility Checker

Checks based on:

Age
Any serious/chronic disease

If donated recently

Shows result with clear message

Helps users understand if they can donate

📊 6. Homepage Live Statistics

Total registered donors

Total blood requests

Real-time updates from LocalStorage

📱 7. Fully Responsive UI

Modern, clean, mobile-friendly layout

Beautiful animations for smooth experience
🛠️ 8. Tech Stack
Area	Technology
Frontend	HTML5, CSS3, JavaScript
Icons	Font Awesome
Storage	Browser LocalStorage
UI Animations	CSS Keyframes
Deployment	Any static hosting (GitHub Pages, Netlify, Vercel)
9.Project Structure
LifeBlood/
│── index.html
│── register.html
│── requests.html
│── donorlist.html
│── eligibility.html
│── styles.css
│── script.js
└── assets/ (optional)
⚙️ How It Works – Workflow
1️⃣ User enters the website

→ Homepage loads → Stats displayed from LocalStorage.

2️⃣ Donor Registers

→ Form submitted → Donor saved to LocalStorage → Redirects to Donor List.

3️⃣ User Requests Blood

→ Form submitted → Request saved → Matching algorithm runs → Modal shows success → Matching donors displayed.

4️⃣ Donor List Page

→ Loads all donors from LocalStorage → Filters applied instantly.
5️⃣ Eligibility Checker

→ User answers questions → JS evaluates → Eligibility result shown.
🔧 How to Run the Project

No backend needed — just open files in browser!

✔ Method 1 — Open Directly

Just double-click index.html.

✔ Method 2 — Run via VS Code Live Server

Install Live Server extension

Right-click → Open with Live Server

✔ Method 3 — GitHub Pages

Upload to GitHub

Go to Settings → Pages

Set branch to main and folder to root

Save → Your site is live 🎉
🤝 Contributing

Pull requests are welcome.
Feel free to open an issue for enhancement ideas.
⭐ Support

If you like this project, consider giving a ⭐ on GitHub 🙌.
