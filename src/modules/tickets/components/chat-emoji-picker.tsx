"use client";

import { useState, useMemo } from "react";
import { Smile, Search, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatEmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string;
}

interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: EmojiItem[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "quick",
    label: "Quick",
    icon: "⚡",
    emojis: [
      { emoji: "👍", name: "thumbs up", keywords: "thumbs up yes like ok approve agree" },
      { emoji: "👎", name: "thumbs down", keywords: "thumbs down no dislike reject" },
      { emoji: "❤️", name: "heart", keywords: "love heart red like" },
      { emoji: "🎉", name: "party popper", keywords: "party celebrate tada hooray congrats" },
      { emoji: "🚀", name: "rocket", keywords: "rocket launch ship fast deploy speed" },
      { emoji: "🔥", name: "fire", keywords: "fire hot lit awesome flame" },
      { emoji: "👀", name: "eyes", keywords: "eyes look see watching inspect review" },
      { emoji: "✅", name: "check mark", keywords: "check done resolved ok pass verified" },
      { emoji: "❌", name: "cross mark", keywords: "cross no x fail reject error bug" },
      { emoji: "⚠️", name: "warning", keywords: "warning alert danger caution note" },
      { emoji: "💡", name: "light bulb", keywords: "idea lightbulb tip note suggestion" },
      { emoji: "🐛", name: "bug", keywords: "bug issue defect glitch error problem" },
      { emoji: "🙏", name: "folded hands", keywords: "pray please thank you thanks grateful" },
      { emoji: "👏", name: "clapping", keywords: "clap applause bravo good job" },
      { emoji: "💯", name: "hundred", keywords: "100 hundred perfect score agree" },
      { emoji: "✨", name: "sparkles", keywords: "sparkles star magic clean new" },
    ],
  },
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      { emoji: "😀", name: "grinning", keywords: "smile happy grinning joy" },
      { emoji: "😃", name: "smiley", keywords: "happy smiley grinning" },
      { emoji: "😄", name: "smile", keywords: "happy joy laughing" },
      { emoji: "😁", name: "beaming", keywords: "grin teeth proud happy" },
      { emoji: "😆", name: "laughing", keywords: "laugh closed eyes funny lol" },
      { emoji: "😅", name: "sweat smile", keywords: "relief nervous sweat awkward" },
      { emoji: "😂", name: "joy", keywords: "tears of joy laughing lol haha funny" },
      { emoji: "🤣", name: "rofl", keywords: "rolling floor laughing lol haha" },
      { emoji: "🥲", name: "smiling tear", keywords: "happy cry proud bittersweet" },
      { emoji: "☺️", name: "smiling", keywords: "warm friendly gentle smile" },
      { emoji: "😊", name: "blush", keywords: "blushing proud happy cute" },
      { emoji: "😇", name: "innocent", keywords: "angel halo good nice" },
      { emoji: "🙂", name: "slight smile", keywords: "polite simple ok fine" },
      { emoji: "🙃", name: "upside down", keywords: "silly sarcastic irony" },
      { emoji: "😉", name: "wink", keywords: "flirt cheeky wink joke" },
      { emoji: "😌", name: "relieved", keywords: "peace calm relief zen" },
      { emoji: "😍", name: "heart eyes", keywords: "love adore awesome stunning" },
      { emoji: "🥰", name: "hearts", keywords: "warm sweet beloved love" },
      { emoji: "😘", name: "kiss", keywords: "blowing kiss love friendly" },
      { emoji: "😋", name: "yum", keywords: "delicious tasty savoring" },
      { emoji: "😜", name: "winking tongue", keywords: "joke playful tease goofy" },
      { emoji: "🤪", name: "zany", keywords: "crazy wild wacky silly" },
      { emoji: "🤨", name: "raised eyebrow", keywords: "suspicious skeptical really" },
      { emoji: "🧐", name: "monocle", keywords: "inspecting investigating curious hm" },
      { emoji: "🤓", name: "nerd", keywords: "geek smart glasses coding" },
      { emoji: "😎", name: "cool", keywords: "sunglasses chill awesome confident" },
      { emoji: "🤩", name: "star struck", keywords: "excited amazed wow impress" },
      { emoji: "🥳", name: "partying", keywords: "celebrate party horn birthday" },
      { emoji: "😏", name: "smirk", keywords: "sly smug suggestive" },
      { emoji: "😒", name: "unamused", keywords: "annoyed bored whatever" },
      { emoji: "😞", name: "disappointed", keywords: "sad regret down" },
      { emoji: "😔", name: "pensive", keywords: "thoughtful sorry remorse" },
      { emoji: "😟", name: "worried", keywords: "nervous concern anxious" },
      { emoji: "😕", name: "confused", keywords: "puzzled unsure hmm" },
      { emoji: "🙁", name: "slightly frowning", keywords: "unhappy sad discontent" },
      { emoji: "🥺", name: "pleading", keywords: "puppy eyes begging please cute" },
      { emoji: "😢", name: "crying", keywords: "sad tear sorrow" },
      { emoji: "😭", name: "sob", keywords: "bawling loud crying tears sad" },
      { emoji: "😤", name: "triumph", keywords: "steam huff determined frustrated" },
      { emoji: "😠", name: "angry", keywords: "mad grumpy upset" },
      { emoji: "😡", name: "rage", keywords: "furious red mad angry" },
      { emoji: "🤯", name: "exploding head", keywords: "mind blown shock disbelief wow" },
      { emoji: "😳", name: "flushed", keywords: "shocked embarrassed wide eyes" },
      { emoji: "🥵", name: "hot", keywords: "heat summer sweaty red" },
      { emoji: "🥶", name: "cold", keywords: "freezing ice blue winter" },
      { emoji: "😱", name: "screaming", keywords: "scared horrified shocked horror" },
      { emoji: "😨", name: "fearful", keywords: "scared nervous frightened" },
      { emoji: "😰", name: "anxious", keywords: "blue sweat fear worry" },
      { emoji: "😥", name: "sad relieved", keywords: "sweat close call phew" },
      { emoji: "😓", name: "downcast sweat", keywords: "stressed exhausted tired" },
      { emoji: "🤗", name: "hug", keywords: "open arms friendly embrace" },
      { emoji: "🤔", name: "thinking", keywords: "ponder hmm question consider" },
      { emoji: "🤭", name: "hand over mouth", keywords: "giggle oops chuckling" },
      { emoji: "🤫", name: "shh", keywords: "quiet silence secret whisper" },
      { emoji: "😶", name: "no mouth", keywords: "speechless quiet mute" },
      { emoji: "😐", name: "neutral", keywords: "straight face blank meh" },
      { emoji: "😑", name: "expressionless", keywords: "unimpressed bored deadpan" },
      { emoji: "😬", name: "grimace", keywords: "awkward nervous cringe yikes" },
      { emoji: "🙄", name: "rolling eyes", keywords: "eye roll sarcastic whatever" },
      { emoji: "🥱", name: "yawning", keywords: "tired sleepy bored" },
      { emoji: "😴", name: "sleeping", keywords: "asleep zzz goodnight" },
      { emoji: "😵", name: "dizzy", keywords: "knockout stunned sick" },
      { emoji: "🤐", name: "zipper mouth", keywords: "secret sealed lips silent" },
      { emoji: "🤢", name: "nauseated", keywords: "green sick disgust gross" },
      { emoji: "🤮", name: "vomiting", keywords: "puke barf gross sick" },
      { emoji: "😷", name: "mask", keywords: "sick doctor medical health" },
    ],
  },
  {
    id: "gestures",
    label: "Hands",
    icon: "👍",
    emojis: [
      { emoji: "👍", name: "thumbs up", keywords: "like yes approve agree good" },
      { emoji: "👎", name: "thumbs down", keywords: "dislike no reject disagree" },
      { emoji: "👊", name: "fist bump", keywords: "punch bro fist bump" },
      { emoji: "✊", name: "raised fist", keywords: "power solidarity strength" },
      { emoji: "🤛", name: "left fist", keywords: "fist bump bro" },
      { emoji: "🤜", name: "right fist", keywords: "fist bump bro" },
      { emoji: "🤞", name: "crossed fingers", keywords: "luck hope wish promise" },
      { emoji: "✌️", name: "peace", keywords: "victory two peace" },
      { emoji: "🤟", name: "love you", keywords: "ily hand love" },
      { emoji: "🤘", name: "rock on", keywords: "metal horns rock concert" },
      { emoji: "👌", name: "ok hand", keywords: "perfect agreed fine nice" },
      { emoji: "🤌", name: "pinched fingers", keywords: "italian chef what do you mean" },
      { emoji: "🤏", name: "pinching hand", keywords: "small tiny little bit" },
      { emoji: "👈", name: "point left", keywords: "point direction back" },
      { emoji: "👉", name: "point right", keywords: "point direction next" },
      { emoji: "👆", name: "point up", keywords: "point up above top" },
      { emoji: "👇", name: "point down", keywords: "point down below under" },
      { emoji: "☝️", name: "index pointing up", keywords: "one point important note" },
      { emoji: "✋", name: "raised hand", keywords: "stop high five wait" },
      { emoji: "🤚", name: "back of hand", keywords: "hand raised" },
      { emoji: "🖐️", name: "fingers splayed", keywords: "five palm stop" },
      { emoji: "🖖", name: "vulcan salute", keywords: "spock star trek live long" },
      { emoji: "👋", name: "wave", keywords: "hello goodbye bye hi" },
      { emoji: "🤙", name: "call me", keywords: "shaka hang loose call" },
      { emoji: "💪", name: "flexed biceps", keywords: "muscle strong power gym work" },
      { emoji: "🦾", name: "mechanical arm", keywords: "robot cyborg bionic" },
      { emoji: "✍️", name: "writing hand", keywords: "write pen note sign memo" },
      { emoji: "🙏", name: "folded hands", keywords: "pray please thank you thanks grateful" },
      { emoji: "🤝", name: "handshake", keywords: "deal agreement partnership meet" },
      { emoji: "👏", name: "clapping", keywords: "applause clap praise kudos" },
      { emoji: "🙌", name: "raising hands", keywords: "celebration praise hooray" },
      { emoji: "👐", name: "open hands", keywords: "open hug welcome" },
      { emoji: "🤲", name: "palms up", keywords: "prayer offering" },
    ],
  },
  {
    id: "tech",
    label: "Work",
    icon: "💻",
    emojis: [
      { emoji: "💻", name: "laptop", keywords: "laptop computer dev coding tech" },
      { emoji: "🖥️", name: "desktop", keywords: "computer screen monitor pc" },
      { emoji: "📱", name: "mobile phone", keywords: "phone smartphone mobile app" },
      { emoji: "⌨️", name: "keyboard", keywords: "type typing dev hardware" },
      { emoji: "🖱️", name: "mouse", keywords: "computer mouse click input" },
      { emoji: "💾", name: "floppy disk", keywords: "save disk storage" },
      { emoji: "📁", name: "folder", keywords: "file directory document" },
      { emoji: "📂", name: "open folder", keywords: "directory browse files" },
      { emoji: "📄", name: "page", keywords: "document paper text file" },
      { emoji: "📊", name: "bar chart", keywords: "analytics stats graph report" },
      { emoji: "📈", name: "chart increasing", keywords: "trend growth up positive" },
      { emoji: "📉", name: "chart decreasing", keywords: "drop down negative loss" },
      { emoji: "📌", name: "pushpin", keywords: "pin notice sticky priority" },
      { emoji: "📎", name: "paperclip", keywords: "attachment file link" },
      { emoji: "🔒", name: "locked", keywords: "security safe protected password" },
      { emoji: "🔓", name: "unlocked", keywords: "open accessible security" },
      { emoji: "🔑", name: "key", keywords: "access password token auth" },
      { emoji: "🔨", name: "hammer", keywords: "build construct tool fix" },
      { emoji: "🛠️", name: "hammer and wrench", keywords: "tools dev settings maintenance" },
      { emoji: "🔧", name: "wrench", keywords: "fix repair configure tool" },
      { emoji: "⚙️", name: "gear", keywords: "settings config system options" },
      { emoji: "⏱️", name: "stopwatch", keywords: "timer performance speed test" },
      { emoji: "⏰", name: "alarm clock", keywords: "time reminder schedule deadline" },
      { emoji: "⏳", name: "hourglass", keywords: "waiting loading pending time" },
      { emoji: "🔍", name: "magnifying glass", keywords: "search find inspect query" },
      { emoji: "📦", name: "package", keywords: "shipping delivery build release" },
      { emoji: "📬", name: "mailbox", keywords: "inbox message mail" },
      { emoji: "✉️", name: "envelope", keywords: "mail email letter message" },
      { emoji: "📧", name: "e-mail", keywords: "email electronic message" },
      { emoji: "🏷️", name: "label", keywords: "tag category ticket version" },
      { emoji: "🎯", name: "direct hit", keywords: "target goal accurate hit" },
      { emoji: "🚀", name: "rocket", keywords: "ship deploy release fast speed" },
      { emoji: "🚧", name: "construction", keywords: "work in progress wip roadwork" },
      { emoji: "🚨", name: "siren", keywords: "alarm alert emergency critical" },
      { emoji: "🐞", name: "lady beetle", keywords: "bug issue defect insect" },
      { emoji: "🐛", name: "bug", keywords: "bug error code defect" },
      { emoji: "⚡", name: "lightning", keywords: "fast quick energy zap" },
      { emoji: "☕", name: "coffee", keywords: "coffee break developer drink" },
      { emoji: "📝", name: "memo", keywords: "note documentation instructions" },
      { emoji: "💬", name: "speech balloon", keywords: "comment chat message talk" },
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "✅",
    emojis: [
      { emoji: "✅", name: "white check mark", keywords: "check pass done ok yes complete" },
      { emoji: "❌", name: "cross mark", keywords: "x no fail error wrong cancel" },
      { emoji: "⭕", name: "heavy large circle", keywords: "circle ok round valid" },
      { emoji: "🛑", name: "stop sign", keywords: "stop halt block forbidden" },
      { emoji: "⛔", name: "no entry", keywords: "blocked denied access stop" },
      { emoji: "🚫", name: "prohibited", keywords: "banned forbidden unauthorized" },
      { emoji: "💯", name: "hundred", keywords: "100 perfect full grade" },
      { emoji: "❗", name: "exclamation", keywords: "attention important alert point" },
      { emoji: "❓", name: "question", keywords: "help query ask question mark" },
      { emoji: "‼️", name: "double exclamation", keywords: "urgent urgent critical" },
      { emoji: "⁉️", name: "interrobang", keywords: "what surprise confusion" },
      { emoji: "⚠️", name: "warning", keywords: "caution alert warning yellow" },
      { emoji: "♻️", name: "recycle", keywords: "environment rerun reuse refresh" },
      { emoji: "❇️", name: "sparkle", keywords: "green star sparkle shine" },
      { emoji: "✳️", name: "eight-spoked asterisk", keywords: "star asterisk note" },
      { emoji: "🌐", name: "globe", keywords: "web internet network online" },
      { emoji: "🔴", name: "red circle", keywords: "red urgent stop offline status" },
      { emoji: "🟢", name: "green circle", keywords: "green active online open pass" },
      { emoji: "🟡", name: "yellow circle", keywords: "yellow in progress pending warning" },
      { emoji: "🔵", name: "blue circle", keywords: "blue info general status" },
      { emoji: "🟣", name: "purple circle", keywords: "purple internal staff special" },
      { emoji: "⚪", name: "white circle", keywords: "white empty inactive" },
      { emoji: "⚫", name: "black circle", keywords: "black neutral closed" },
    ],
  },
];

export function ChatEmojiPicker({ onSelectEmoji, disabled, className }: ChatEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("quick");

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
      return cat ? cat.emojis : [];
    }

    const matched: EmojiItem[] = [];
    const seen = new Set<string>();

    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          !seen.has(item.emoji) &&
          (item.name.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q))
        ) {
          seen.add(item.emoji);
          matched.push(item);
        }
      }
    }
    return matched;
  }, [search, activeCategory]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "size-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
              className
            )}
            disabled={disabled}
            aria-label="Add emoji"
          />
        }
      >
        <Smile className="size-4" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[330px] sm:w-[360px] p-2.5 shadow-xl border-border bg-popover z-50 rounded-xl flex flex-col gap-2"
      >
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="h-8 pl-8 pr-7 text-xs bg-muted/30 focus-visible:ring-1"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Category Tabs (visible when not searching) */}
        {!search && (
          <div className="flex items-center gap-1 border-b border-border/60 pb-1.5 px-0.5 overflow-x-auto scrollbar-none">
            {EMOJI_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  title={cat.label}
                  className={`shrink-0 px-2 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-xs">{cat.icon}</span>
                  <span className="text-[11px]">{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="max-h-48 overflow-y-auto pr-0.5 min-h-0">
          {filteredEmojis.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No emojis found for &quot;{search}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 p-0.5">
              {filteredEmojis.map((item) => (
                <button
                  key={item.emoji + item.name}
                  type="button"
                  onClick={() => onSelectEmoji(item.emoji)}
                  title={item.name}
                  className="size-8 text-lg rounded-md flex items-center justify-center hover:bg-muted/80 hover:scale-115 active:scale-95 transition-all select-none"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
