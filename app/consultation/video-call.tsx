import { joinTestCall } from "@/lib/services/misc";
import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
  type TrackIdentifier,
} from "@twilio/video-react-native-sdk";
import { useRouter } from "expo-router";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// The test video call (same shared 30-minute room as the webapp's "Test call"),
// for trying camera and microphone between a doctor and a patient.
export default function VideoCallScreen() {
  const router = useRouter();

  const twilioRef = useRef<TwilioVideo>(null);

  const [status, setStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteTrack, setRemoteTrack] = useState<TrackIdentifier | null>(null);
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
      const result = await joinTestCall();

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
        onRoomDidFailToConnect={(event) => setErrorMessage(event?.error?.message ?? "Could not connect to the call")}
        onRoomDidDisconnect={(event) => {
          if (event?.error) setErrorMessage(event.error.message ?? "The call ended unexpectedly");
          setStatus("ended");
        }}
        onParticipantAddedVideoTrack={({ participant, track }) => {
          setRemoteTrack({ participantSid: participant.sid, videoTrackSid: track.trackSid });
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
        }}
      />

      {remoteTrack ? (
        <TwilioVideoParticipantView style={StyleSheet.absoluteFillObject} trackIdentifier={remoteTrack} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, s.waitingWrap]}>
          {status === "connecting" ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={s.waitingText}>Waiting for the other participant to join…</Text>
          )}
        </View>
      )}

      <TwilioVideoLocalView enabled={camEnabled} style={s.localPreview} />

      <View style={s.controls}>
        <Pressable onPress={toggleMic} style={[s.controlBtn, { backgroundColor: micEnabled ? "#ffffff33" : "#ef4444" }]}>
          {micEnabled ? <Mic size={22} color="#fff" /> : <MicOff size={22} color="#fff" />}
        </Pressable>
        <Pressable onPress={endCall} style={[s.controlBtn, s.endCallBtn]}>
          <PhoneOff size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={toggleCamera} style={[s.controlBtn, { backgroundColor: camEnabled ? "#ffffff33" : "#ef4444" }]}>
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
