"use client";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import LoginForm from "@/components/LoginForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <LoginForm />
    </div>
  );
}
