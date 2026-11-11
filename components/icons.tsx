import { Film, Gamepad2, Heart, Link2, Music, Star } from "lucide-react";
import { SiSpotify, SiTwitch, SiYoutube } from "react-icons/si";
import type { Shortcut } from "../lib/settings";

export function SiteIcon({ icon, size = 20 }: { icon: Shortcut["icon"]; size?: number }) {
  switch (icon) {
    case "youtube": return <SiYoutube size={size} aria-hidden />;
    case "twitch": return <SiTwitch size={size} aria-hidden />;
    case "spotify": return <SiSpotify size={size} aria-hidden />;
    case "ptt": return <span className="ptt-icon" aria-hidden>批</span>;
    case "bahamut": return <Gamepad2 size={size} aria-hidden />;
    case "film": return <Film size={size} aria-hidden />;
    case "music": return <Music size={size} aria-hidden />;
    case "game": return <Gamepad2 size={size} aria-hidden />;
    case "heart": return <Heart size={size} aria-hidden />;
    case "star": return <Star size={size} aria-hidden />;
    default: return <Link2 size={size} aria-hidden />;
  }
}
