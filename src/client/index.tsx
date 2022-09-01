import React from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './components/App/App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <>
    <ToastContainer position="bottom-right" limit={3} theme="colored" autoClose={5000} />
    <App />
  </>,
);
