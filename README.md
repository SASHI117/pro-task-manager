# Pro Task Manager 🧠  

This project is a **Task Manager Dashboard** built with **React + Firebase + Tailwind CSS**, designed to help users organize their tasks efficiently.  
It features secure authentication (Signup, Login, Forgot Password) and a dynamic dashboard layout.  

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).  

---

## 📦 Available Scripts  

In the project directory, you can run:  

### `npm start`  
Runs the app in the development mode.  
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.  

The page will reload when you make changes.  
You may also see any lint errors in the console.  

---

### `npm run build`  
Builds the app for production to the `build` folder.  
It correctly bundles React in production mode and optimizes the build for the best performance.  

The build is minified and the filenames include the hashes.  
Your app is ready to be deployed!  

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.  

---

### `npm test`  
Launches the test runner in the interactive watch mode.  
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.  

---

### `npm run eject`  
**Note:** this is a one-way operation. Once you `eject`, you can't go back!  

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time.  
This will copy all configuration files and transitive dependencies (webpack, Babel, ESLint, etc.) directly into your project.  

---

## 🔧 Environment Setup  

Before running the app, create a `.env` file in the root folder and add your Firebase configuration:  

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id


Make sure your `.env` file is **listed in `.gitignore`** to keep your keys private.  

---

## ⚙️ Features  

- 🔐 **User Authentication** (Signup, Login, Forgot Password)  
- 🧭 **Dashboard Layout** with reusable components  
- ☁️ **Firebase Firestore Database** for task storage  
- 💅 **Tailwind CSS Styling** for a clean UI  
- ⚡ **Responsive Design** for mobile and desktop  

---

## 📁 Project Structure  

src/
├── App.jsx
├── index.js
├── firebase.js
├── contexts/
│ └── AuthContext.js
├── components/
│ └── DashboardLayout.jsx
└── pages/
├── LoginPage.jsx
├── SignupPage.jsx
└── ForgotPasswordPage.jsx


---

## 🚀 Deployment  

You can deploy your build folder using:  
- **Vercel**
- **Netlify**
- **Firebase Hosting**

Refer to [Deployment Guide](https://facebook.github.io/create-react-app/docs/deployment) for step-by-step instructions.  

---

## 📚 Learn More  

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).  
To learn React, check out the [React documentation](https://reactjs.org/).  

---

### Author  
👤 **Sashi Vardhan Pragada**  
🔗 [GitHub Profile](https://github.com/SASHI117)

---

