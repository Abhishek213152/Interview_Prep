import React from "react";

const Button = ({ children, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
