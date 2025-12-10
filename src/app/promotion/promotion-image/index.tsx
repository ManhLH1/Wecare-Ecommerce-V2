import React from "react";
import Image from "next/image";
import Loading from "@/components/loading";

interface ProductGroupImageDisplayProps {
  cr1bb_urlimage: string;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  imageError: boolean;
}

const ProductGroupImage: React.FC<ProductGroupImageDisplayProps> = ({
  cr1bb_urlimage,
  handleImageError,
  imageError,
}) => {
  return (
    <>
      {cr1bb_urlimage ? (
        <>
          <div className="relative w-24 h-24 mr-4">
            <Image
              src={cr1bb_urlimage}
              alt="Promotion"
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
              onError={handleImageError}
            />
          </div>
          {imageError && <p>Không thể tải hình ảnh</p>}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-4">
          <Loading />
          <p className="text-gray-500 text-sm">Đang tải ảnh...</p>
        </div>
      )}
    </>
  );
};

export default ProductGroupImage;
