import React from "react";

interface CardProps {
  imageSrc?: string;
  imageAlt?: string;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  imageSrc,
  imageAlt = "",
  title,
  description,
  buttonText = "",
  onButtonClick,
}) => {
  return (
    <div className="text-white rounded-lg overflow-hidden shadow-md border border-gray-700">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="h-40 bg-gray-600 flex items-center justify-center">
          <span className="text-gray-300">Image cap</span>
        </div>
      )}
      <div className="p-4">
        <h5 className="text-lg font-semibold mb-2">{title}</h5>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        {buttonText && (
          <button
            onClick={onButtonClick}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default Card;
