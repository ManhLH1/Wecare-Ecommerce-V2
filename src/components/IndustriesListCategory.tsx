"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
import Loading from "./loading";

// Define the structure of your industry data
interface Industry {
  cr1bb_data_website_ecommerceid?: string;
  cr1bb_img_url?: string;
  cr1bb_title?: string;
  cr1bb_header?: string;
  cr1bb_excerpt?: string;
}

const IndustriesList: React.FC = () => {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        setLoading(true);
        const response = await axios.get<{
          success: boolean;
          data: { value: Industry[] };
        }>("/api/getDataContent?tag=Ngành%20nghề");
        if (response.data.success && Array.isArray(response.data.data.value)) {
          setIndustries(response.data.data.value);
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        console.error("Error fetching industries - fetchIndustries - line 35: ", error);
        setError("Failed to load industries. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchIndustries();
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <section className="industries-list bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-center">Ngành Nghề</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {industries.map((industry, index) => (
            <div
              key={industry.cr1bb_data_website_ecommerceid || index}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="relative h-48">
                {industry.cr1bb_img_url ? (
                  <Image
                    src={industry.cr1bb_img_url}
                    alt={industry.cr1bb_title || "Industry image"}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    objectFit="cover"
                    onError={(
                      e: React.SyntheticEvent<HTMLImageElement, Event>
                    ) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder-image.jpg";
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">
                  {industry.cr1bb_header || "Tên ngành nghề"}
                </h3>
                <p className="text-gray-600 text-sm">
                  {industry.cr1bb_excerpt ||
                    "Thông tin chi tiết về ngành nghề."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustriesList;
