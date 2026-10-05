"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

export default function ParticipantCredentialPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/public/participants/${token}`).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) setError(payload.error);
      else {
        setData(payload.participant);
        setQr(
          await QRCode.toDataURL(window.location.href, {
            width: 360,
            margin: 2,
          }),
        );
      }
    });
  }, [token]);
  const event = data?.events;
  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-blue-900">
          Credencial do participante
        </h1>
        {error && <p className="mt-4 text-red-700">{error}</p>}
        {data && (
          <>
            <h2 className="mt-5 text-xl font-semibold">
              {data.participant_name}
            </h2>
            <p className="mt-2 font-medium">{event?.title}</p>
            <p className="text-sm text-gray-600">
              {event?.start_date &&
                new Date(`${event.start_date}T12:00:00`).toLocaleDateString(
                  "pt-BR",
                )}{" "}
              · {String(event?.start_time || "").slice(0, 5)}
            </p>
            <p className="text-sm text-gray-600">{event?.spaces?.name}</p>
            {qr && (
              <img
                src={qr}
                alt="QR Code de credenciamento"
                className="mx-auto my-5 h-72 w-72"
              />
            )}
            <p
              className={`rounded-lg p-3 font-medium ${data.presence_confirmed ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-800"}`}
            >
              {data.presence_confirmed
                ? "Presença confirmada"
                : "Apresente este QR Code na recepção"}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
