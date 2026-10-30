import { joinConsultationCall, joinTestCall } from "@/lib/services/misc";
import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
  type TrackIdentifier,
} from "@twilio/video-react-native-sdk";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// A Twilio Video call, two ways:
//   - with `reference`: the consultation's call, only for its patient and doctor;
//   - without: a private camera and microphone check, with only you in the room.

/** Android asks for camera and microphone at run time; iOS asks by itself when the call starts. */
async function askForCameraAndMic(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
  return (
    result[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
  );
}

/** Readable text for Twilio errors. */
function callError(code: number | undefined, message: string | undefined) {
  if (code === 53105) return "This call is full. Please try again in a moment.";
  if (code === 53205) return "You joined this call on another device, so it ended here.";
  if (code === 53216) return "The time for this call is up. Join again to keep talking.";
  return message ?? "The call ended unexpectedly";
}

export default function VideoCallScreen() {
  const router = useRouter();
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  const check = !reference;

  const twilioRef = useRef<TwilioVideo>(null);

  const [status, setStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<TrackIdentifier | null>(null);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const endCall = useCallback(() => {
    twilioRef.current?.disconnect();
    setStatus("ended");
    router.back();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!(await askForCameraAndMic())) {
        if (cancelled) return;
        Alert.alert(
          "Camera and microphone needed",
          "Allow Gynex to use your camera and microphone in Settings, then try again.",
          [
            { text: "Not now", style: "cancel", onPress: () => router.back() },
            { text: "Open Settings", onPress: () => { void Linking.openSettings(); router.back(); } },
          ],
        );
        return;
      }

      const result = reference ? await joinConsultationCall(reference) : await joinTestCall();
      if (cancelled) return;
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      twilioRef.current?.connect({
        accessToken: result.data.token,
        roomName: result.data.roomName,
        enableAudio: true,
        enableVideo: true,
      });
    })();

    return () => {
      cancelled = true;
      twilioRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    Alert.alert("Couldn't join the video call", errorMessage, [{ text: "OK", onPress: () => router.back() }]);
  }, [errorMessage, router]);

  const toggleMic = () => {
    const next = !micEnabled;
    twilioRef.current?.setLocalAudioEnabled(next);
    setMicEnabled(next);
  };

  const toggleCamera = () => {
    const next = !camEnabled;
    twilioRef.current?.setLocalVideoEnabled(next);
    setCamEnabled(next);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: "#000" }]}>
      <TwilioVideo
        ref={twilioRef}
        style={StyleSheet.absoluteFillObject}
        onRoomDidConnect={() => setStatus("connected")}
        onRoomDidFailToConnect={(event) => setErrorMessage(callError(event?.error?.code, event?.error?.message ?? "Could not connect to the call"))}
        onRoomDidDisconnect={(event) => {
          if (event?.error) setErrorMessage(callError(event.error.code, event.error.message));
          setStatus("ended");
        }}
        onParticipantAddedVideoTrack={({ participant, track }) => {
          setRemoteTrack({ participantSid: participant.sid, videoTrackSid: track.trackSid });
          // Identity is "role|name|id" (set by the backend).
          const [role, name] = (participant.identity ?? "").split("|");
          setRemoteName(name ? `${name} · ${role === "doctor" ? "Doctor" : "Patient"}` : null);
        }}
        onParticipantRemovedVideoTrack={({ participant, track }) => {
          setRemoteTrack((current) =>
            current?.participantSid === participant.sid && current?.videoTrackSid === track.trackSid
              ? null
              : current,
          );
        }}
        onRoomParticipantDidDisconnect={({ participant }) => {
          setRemoteTrack((current) => (current?.participantSid === participant.sid ? null : current));
          setRemoteName(null);
        }}
      />

      {check ? (
        // Only you: your own camera fills the screen.
        <>
          <TwilioVideoLocalView enabled={camEnabled} style={StyleSheet.absoluteFillObject} />
          <View style={s.topLabel}>
            <Text style={s.topLabelText}>
              {status === "connecting" ? "Starting your camera…" : "Only you · this is how you'll look on a call"}
            </Text>
          </View>
        </>
      ) : (
        <>
          {remoteTrack ? (
            <TwilioVideoParticipantView style={StyleSheet.absoluteFillObject} trackIdentifier={remoteTrack} />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, s.waitingWrap]}>
              {status === "connecting" ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Text style={s.waitingText}>Waiting for the other person to join…</Text>
              )}
            </View>
          )}
          {remoteName && (
            <View style={s.topLabel}>
              <Text style={s.topLabelText}>{remoteName}</Text>
            </View>
          )}
          <TwilioVideoLocalView enabled={camEnabled} style={s.localPreview} />
        </>
      )}

      <View style={s.controls}>
        <Pressable onPress={toggleMic} style={[s.controlBtn, { backgroundColor: micEnabled ? "#ffffff33" : "#ef4444" }]} accessibilityLabel={micEnabled ? "Mute" : "Unmute"}>
          {micEnabled ? <Mic size={22} color="#fff" /> : <MicOff size={22} color="#fff" />}
        </Pressable>
        <Pressable onPress={endCall} style={[s.controlBtn, s.endCallBtn]} accessibilityLabel={check ? "End check" : "Leave call"}>
          <PhoneOff size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={toggleCamera} style={[s.controlBtn, { backgroundColor: camEnabled ? "#ffffff33" : "#ef4444" }]} accessibilityLabel={camEnabled ? "Turn camera off" : "Turn camera on"}>
          {camEnabled ? <Video size={22} color="#fff" /> : <VideoOff size={22} color="#fff" />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  waitingWrap: { alignItems: "center", justifyContent: "center" },
  waitingText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  topLabel: {
    position: "absolute",
    top: 60,
    left: 16,
    borderRadius: 999,
    backgroundColor: "#00000080",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  topLabelText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  localPreview: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  controls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  controlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  endCallBtn: { backgroundColor: "#ef4444", width: 64, height: 64, borderRadius: 32 },
});
