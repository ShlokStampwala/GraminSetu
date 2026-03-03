import React from "react";
import { Link } from "react-router-dom";

export default function Button({
  children,
  to,
  variant = "primary",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center px-6 py-3 font-medium transition rounded-xl";

  const styles = {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700",
    outline:
      "border border-emerald-600 text-emerald-600 hover:bg-emerald-50",
  };

  if (to) {
    return (
      <Link
        to={to}
        className={`${base} ${styles[variant]} ${className}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
