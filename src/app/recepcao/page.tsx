"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, StopCircle, Users } from "lucide-react";
import { MainLayout } from "@/components/layout";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  LoadingSpinner,
} from "@/components/ui";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { supabase } from "@/lib/supabase/auth";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

interface EventItem {
  id: string;
  title: string;
  start_date: string;
  start_time: string;
  spaces?: { name: string } | Array<{ name: string }> | null;
}
interface Participant {
  id: string;
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  access_link: string;
  presence_confirmed: boolean;
  presence_time: string | null;
}

export default function ReceptionPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const loadEvents = async () => {
    const today = new Date().toLocaleDateString("en-CA");
    const { data, error: queryError } = await supabase
      .from("events")
      .select("id,title,start_date,start_time,spaces(name)")
      .eq("status", "confirmada")
      .gte("start_date", today)
      .order("start_date");
    if (queryError) setError(queryError.message);
    else {
      setEvents((data ?? []) as EventItem[]);
      setEventId((current) => current || data?.[0]?.id || "");
    }
    setLoading(false);
  };
  const loadParticipants = async (selected = eventId) => {
    if (!selected) {
      setParticipants([]);
      return;
    }
    const { data, error: queryError } = await supabase
      .from("attendance_list")
      .select("*")
      .eq("event_id", selected)
      .order("participant_name");
    if (queryError) setError(queryError.message);
    else setParticipants((data ?? []) as Participant[]);
  };
  useEffect(() => {
    void loadEvents();
    return () => stopScanner();
  }, []);
  useEffect(() => {
    void loadParticipants();
  }, [eventId]);
  const confirmPresence = async (participant: Participant) => {
    const confirmed = !participant.presence_confirmed;
    const { error: updateError } = await supabase
      .from("attendance_list")
      .update({
        presence_confirmed: confirmed,
        presence_time: confirmed ? new Date().toISOString() : null,
      })
      .eq("id", participant.id);
    if (updateError) setError(updateError.message);
    else await loadParticipants();
  };
  const checkToken = async (raw: string) => {
    const token =
      raw.split("/participante/").pop()?.split(/[?#]/)[0] || raw.trim();
    const { data, error: queryError } = await supabase
      .from("attendance_list")
      .select("*")
      .eq("event_id", eventId)
      .eq("access_link", token)
      .single();
    if (queryError || !data) {
      setError("QR Code não pertence à lista deste evento.");
      return;
    }
    if (!data.presence_confirmed) await confirmPresence(data as Participant);
    setError("");
    stopScanner();
  };
  const stopScanner = () => {
    scannerControls.current?.stop();
    scannerControls.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream)
      stream.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };
  const startScanner = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "O navegador não permite acesso à câmera neste contexto.",
        );
      if (!videoRef.current)
        throw new Error("Visualização da câmera indisponível.");
      stopScanner();
      const reader = new BrowserQRCodeReader();
      setScanning(true);
      scannerControls.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          if (!result) return;
          scannerControls.current?.stop();
          void checkToken(result.getText());
        },
      );
    } catch (cameraError) {
      setError(
        `Não foi possível acessar a câmera: ${cameraError instanceof Error ? cameraError.message : "verifique a permissão do navegador"}.`,
      );
      stopScanner();
    }
  };
  const confirmed = participants.filter(
    (item) => item.presence_confirmed,
  ).length;
  return (
    <ProtectedRoute allowedRoles={["administrador", "recepcao"]}>
      <MainLayout
        title="Recepção de Eventos"
        subtitle="Credenciamento e confirmação de presença"
      >
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>
          )}
          {loading ? (
            <div className="flex justify-center p-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : !events.length ? (
            <EmptyState
              icon={<Users size={42} />}
              title="Nenhum evento confirmado"
              description="Não existem eventos futuros disponíveis para credenciamento."
            />
          ) : (
            <>
              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-end">
                  <label>
                    <span className="mb-1 block text-sm font-medium">
                      Evento
                    </span>
                    <select
                      className="w-full rounded-lg border px-3 py-2"
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                    >
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {new Date(
                            `${event.start_date}T12:00:00`,
                          ).toLocaleDateString("pt-BR")}{" "}
                          — {event.title} —{" "}
                          {Array.isArray(event.spaces)
                            ? event.spaces[0]?.name
                            : event.spaces?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    onClick={() => void loadParticipants()}
                    variant="outline"
                  >
                    <RefreshCw size={16} />
                    Atualizar
                  </Button>
                </CardContent>
              </Card>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Leitor de QR Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video overflow-hidden rounded-lg bg-gray-900">
                      <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mt-3">
                      {scanning ? (
                        <Button variant="danger" onClick={stopScanner}>
                          <StopCircle size={17} />
                          Parar câmera
                        </Button>
                      ) : (
                        <Button onClick={() => void startScanner()}>
                          <Camera size={17} />
                          Ler QR Code
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>
                      Participantes — {confirmed}/{participants.length}{" "}
                      presentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!participants.length ? (
                      <p className="p-8 text-center text-gray-500">
                        Nenhum participante vinculado.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-medium">
                                {participant.participant_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {participant.participant_email} ·{" "}
                                {participant.participant_phone}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {participant.presence_confirmed && (
                                <Badge variant="success">Confirmada</Badge>
                              )}
                              <Button
                                size="sm"
                                variant={
                                  participant.presence_confirmed
                                    ? "outline"
                                    : "primary"
                                }
                                onClick={() =>
                                  void confirmPresence(participant)
                                }
                              >
                                <Check size={16} />
                                {participant.presence_confirmed
                                  ? "Desfazer"
                                  : "Confirmar presença"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
