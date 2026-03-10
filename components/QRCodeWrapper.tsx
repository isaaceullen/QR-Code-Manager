"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import QRCodeStyling, { Options } from "qr-code-styling";

interface QRCodeWrapperProps {
  data: string;
  size?: number;
  color?: string;
  logoUrl?: string;
  style?: "square" | "dots" | "rounded";
  className?: string;
  id?: string;
}

export interface QRCodeWrapperHandle {
  download: (extension: "png" | "svg", name?: string) => void;
}

const QRCodeWrapper = forwardRef<QRCodeWrapperHandle, QRCodeWrapperProps>(
  ({ data, size = 220, color = "#000000", logoUrl, style = "square", className, id }, ref) => {
    const divRef = useRef<HTMLDivElement>(null);
    const qrCode = useRef<QRCodeStyling | null>(null);

    useImperativeHandle(ref, () => ({
      download: (extension: "png" | "svg", name?: string) => {
        if (qrCode.current) {
          qrCode.current.download({ extension, name: name || "qrcode" });
        }
      },
    }));

    useEffect(() => {
      if (typeof window !== "undefined") {
        qrCode.current = new QRCodeStyling({
          width: size,
          height: size,
          type: "svg",
          data: data,
          image: logoUrl,
          dotsOptions: {
            color: color,
            type: style === "dots" ? "dots" : style === "rounded" ? "rounded" : "square",
          },
          cornersSquareOptions: {
            type: style === "dots" ? "dot" : style === "rounded" ? "extra-rounded" : "square",
            color: color,
          },
          cornersDotOptions: {
            type: style === "dots" ? "dot" : style === "rounded" ? "dot" : "square",
            color: color,
          },
          backgroundOptions: {
            color: "#FFFFFF",
          },
          imageOptions: {
            crossOrigin: "anonymous",
            margin: 5,
          },
        });

        if (divRef.current) {
          divRef.current.innerHTML = "";
          qrCode.current.append(divRef.current);
        }
      }
    }, [data, size, color, logoUrl, style]);

    return <div ref={divRef} className={className} id={id} />;
  }
);

QRCodeWrapper.displayName = "QRCodeWrapper";

export default QRCodeWrapper;
