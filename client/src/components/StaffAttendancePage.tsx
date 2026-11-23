import { useEffect, useRef, useState } from "react";
import { Camera, Check, MapPin, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Props = { onNotify: (message: string) => void };

function moneyDistance(m: number | null | undefined) {
  if (m == null) return "—";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

export function StaffAttendancePage({ onNotify }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const officeQuery = trpc.domain.staffAttendance.office.useQuery(undefined, { retry: false });
  const mineQuery = trpc.domain.staffAttendance.todayMine.useQuery(undefined, { retry: false });
  const listQuery = trpc.domain.staffAttendance.listToday.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const checkIn = trpc.domain.staffAttendance.checkIn.useMutation({
    onSuccess: async (res) => {
      onNotify(res.message);
      await utils.domain.staffAttendance.todayMine.invalidate();
      await utils.domain.staffAttendance.listToday.invalidate();
    },
    onError: (err) => onNotify(err.message || "Gagal absensi."),
  });

  const saveOffice = trpc.domain.staffAttendance.saveOffice.useMutation({
    onSuccess: async () => {
      onNotify("Lokasi kantor disimpan.");
      await utils.domain.staffAttendance.office.invalidate();
    },
    onError: (err) => onNotify(err.message),
  });

  const office = officeQuery.data;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const refreshGeo = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Perangkat tidak mendukung GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGeoError(err.message || "Gagal membaca lokasi. Izinkan akses lokasi.");
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      refreshGeo();
    } catch {
      onNotify("Kamera tidak bisa dinyalakan. Izinkan akses kamera di browser.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const captureAndSubmit = async (type: "check_in" | "check_out") => {
    if (!videoRef.current || !cameraOn) {
      onNotify("Nyalakan kamera dulu.");
      return;
    }
    if (!coords) {
      onNotify("Lokasi GPS belum tersedia. Ketuk 'Perbarui lokasi'.");
      refreshGeo();
      return;
    }
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      const w = videoRef.current.videoWidth || 640;
      const h = videoRef.current.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak tersedia");
      ctx.drawImage(videoRef.current, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      await checkIn.mutateAsync({
        type,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracyMeters: coords.accuracy,
        photoBase64: base64,
      });
    } catch {
      // error via mutation onError
    } finally {
      setBusy(false);
    }
  };

  const useCurrentAsOffice = () => {
    if (!coords) {
      onNotify("Ambil lokasi GPS dulu.");
      return;
    }
    saveOffice.mutate({
      name: office?.name || "KIDDLES BSD — Kantor",
      address: office?.address || undefined,
      latitude: coords.lat,
      longitude: coords.lng,
      radiusMeters: office?.radiusMeters ?? 50,
    });
  };

  const distancePreview =
    office && coords
      ? Math.round(
          (() => {
            const toRad = (d: number) => (d * Math.PI) / 180;
            const R = 6371000;
            const dLat = toRad(office.latitude - coords.lat);
            const dLon = toRad(office.longitude - coords.lng);
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(coords.lat)) * Math.cos(toRad(office.latitude)) * Math.sin(dLon / 2) ** 2;
            return 2 * R * Math.asin(Math.sqrt(a));
          })(),
        )
      : null;

  const inside =
    distancePreview != null && office != null ? distancePreview <= office.radiusMeters : null;

  return (
    <div className="page-stack">
      <div className="panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Staf · Geofence + Selfie</span>
            <h3>Absensi Karyawan / Admin</h3>
            <p>
              Check-in/out di area kantor (GPS + selfie). Admin set titik di lokasi nyata. Radius default 50 m agar GPS ponsel masih bisa dipakai. Jika gagal: pastikan migrasi DB sudah jalan dan titik kantor sudah di-set admin.
            </p>
          </div>
        </div>

        <div className="panel" style={{ background: "#eef4fb", marginTop: 12 }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={16} /> {office?.name || "Memuat lokasi kantor…"}
          </strong>
          <p style={{ margin: "8px 0 0", color: "#68717b", fontSize: 13 }}>
            {office?.address}
            {office ? (
              <>
                <br />
                Titik: {office.latitude.toFixed(5)}, {office.longitude.toFixed(5)} · Toleransi tetap <strong>1 m</strong> · sumber {office.source}
              </>
            ) : null}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button type="button" className="button button--outline" onClick={refreshGeo}>
              Perbarui lokasi saya
            </button>
            <button type="button" className="button button--soft" onClick={useCurrentAsOffice} disabled={!coords || saveOffice.isPending}>
              Set titik kantor di sini (radius 50 m)
            </button>
          </div>
          {geoError && <p style={{ color: "#9B3A5A", marginTop: 8 }}>{geoError}</p>}
          {coords && (
            <p style={{ marginTop: 8, fontSize: 13 }}>
              GPS Anda: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · akurasi ±{Math.round(coords.accuracy)} m
              {distancePreview != null && (
                <>
                  {" "}
                  · jarak ke kantor <strong>{moneyDistance(distancePreview)}</strong>{" "}
                  {inside ? (
                    <span style={{ color: "#1F6B4A" }}>(dalam area)</span>
                  ) : (
                    <span style={{ color: "#B86B1A" }}>(di luar area)</span>
                  )}
                </>
              )}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <div
              style={{
                background: "#111",
                borderRadius: 12,
                overflow: "hidden",
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraOn ? "block" : "none" }} />
              {!cameraOn && (
                <div style={{ color: "#aaa", textAlign: "center", padding: 24 }}>
                  <Camera size={32} />
                  <p>Kamera depan untuk selfie</p>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {!cameraOn ? (
                <button type="button" className="button button--dark" onClick={() => void startCamera()}>
                  <Camera size={15} /> Nyalakan kamera
                </button>
              ) : (
                <button type="button" className="button button--outline" onClick={stopCamera}>
                  Matikan kamera
                </button>
              )}
              <button
                type="button"
                className="button button--dark"
                disabled={busy || checkIn.isPending}
                onClick={() => void captureAndSubmit("check_in")}
              >
                <Check size={15} /> Check-in
              </button>
              <button
                type="button"
                className="button button--soft"
                disabled={busy || checkIn.isPending}
                onClick={() => void captureAndSubmit("check_out")}
              >
                Check-out
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px" }}>Absensi saya hari ini</h4>
            <div className="snapshot-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Jarak</th>
                  </tr>
                </thead>
                <tbody>
                  {(mineQuery.data ?? []).map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.createdAt).toLocaleTimeString("id-ID")}</td>
                      <td>{row.type === "check_in" ? "Masuk" : "Pulang"}</td>
                      <td>{row.status}</td>
                      <td>{moneyDistance(row.distanceMeters)}</td>
                    </tr>
                  ))}
                  {!(mineQuery.data?.length) && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-table-state">Belum ada check-in hari ini.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h4 style={{ margin: "20px 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={16} /> Semua staf hari ini (admin)
            </h4>
            <div className="snapshot-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Waktu</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Jarak</th>
                  </tr>
                </thead>
                <tbody>
                  {(listQuery.data ?? []).map((row) => (
                    <tr key={row.id}>
                      <td>#{row.userId}</td>
                      <td>{new Date(row.createdAt).toLocaleTimeString("id-ID")}</td>
                      <td>{row.type === "check_in" ? "Masuk" : "Pulang"}</td>
                      <td>{row.status}</td>
                      <td>{moneyDistance(row.distanceMeters)}</td>
                    </tr>
                  ))}
                  {!(listQuery.data?.length) && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-table-state">Belum ada data / tidak berizin manager.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
