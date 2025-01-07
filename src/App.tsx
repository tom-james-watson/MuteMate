import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Play, Settings, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HistoryItem {
    id: number;
    text: string;
}

interface Preferences {
    speed: number;
    voice: string;
}

const getReadableLanguageName = (langCode: string) => {
    try {
        const languageNames = new Intl.DisplayNames([navigator.language], {
            type: "language",
            style: "long",
        });
        return languageNames.of(langCode);
    } catch (error) {
        return langCode; // Fallback to original code if something goes wrong
    }
};

function App() {
    const [input, setInput] = useState("");
    const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(
        null,
    );
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
        return JSON.parse(localStorage.getItem("history") || "[]");
    });
    const [preferences, setPreferences] = useState<Preferences>(() => {
        return JSON.parse(
            localStorage.getItem("preferences") || '{"speed": 1, "voice": ""}',
        );
    });
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [bestVoice, setBestVoice] = useState<
        SpeechSynthesisVoice | undefined
    >();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices();
            setVoices(availableVoices);
            const best = findBestVoice(availableVoices);
            setBestVoice(best);

            if (!preferences.voice && best) {
                setPreferences((prev) => ({
                    ...prev,
                    voice: best.name,
                }));
            }
        };

        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    useEffect(() => {
        localStorage.setItem("preferences", JSON.stringify(preferences));
    }, [preferences]);

    useEffect(() => {
        localStorage.setItem("history", JSON.stringify(historyItems));
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTop = container.scrollHeight;
        }
    }, [historyItems]);

    const findBestVoice = (availableVoices: SpeechSynthesisVoice[]) => {
        const lang = navigator.language;

        const google = availableVoices.find(
            (v) =>
                v.name.includes("Google") &&
                v.lang.toLowerCase() === lang.toLowerCase(),
        );
        if (google) return google;

        const macOSDaniel = availableVoices.find((v) =>
            v.name.toLowerCase().includes("daniel"),
        );
        if (macOSDaniel) return macOSDaniel;

        const microsoft = availableVoices.find(
            (v) =>
                v.name.includes("Microsoft") &&
                v.lang.toLowerCase() === lang.toLowerCase(),
        );
        if (microsoft) return microsoft;

        const anyGoogle = availableVoices.find((v) =>
            v.name.includes("Google"),
        );
        if (anyGoogle) return anyGoogle;
    };

    const speak = (text: string, id: number) => {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        if (currentlyPlaying === id) {
            setCurrentlyPlaying(null);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = preferences.speed;

        const selectedVoice = voices.find(
            (voice) => voice.name === preferences.voice,
        );
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onend = () => {
            setCurrentlyPlaying(null);
        };

        setCurrentlyPlaying(id);
        speechSynthesis.speak(utterance);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newItem = {
            id: Date.now(),
            text: input.trim(),
        };

        setHistoryItems((prev) => [newItem, ...prev]);
        speak(newItem.text, newItem.id);
        setInput("");
    };

    const clearHistory = () => {
        setHistoryItems([]);
    };

    const inputSection = (
        <>
            <form onSubmit={handleSubmit} className="flex-1 flex space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 p-3 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type something and press Enter..."
                    autoComplete="off"
                />
            </form>

            <Dialog.Root>
                <Dialog.Trigger asChild>
                    <button className="p-2 hover:bg-gray-700 rounded">
                        <Settings className="w-4 h-4" />
                    </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-700 p-6 rounded-lg w-96 text-gray-100">
                        <Dialog.Title className="text-xl mb-4">
                            Preferences
                        </Dialog.Title>

                        <div className="mb-4">
                            <label className="block mb-2">Speed</label>
                            <select
                                value={preferences.speed}
                                onChange={(e) =>
                                    setPreferences((prev) => ({
                                        ...prev,
                                        speed: parseFloat(e.target.value),
                                    }))
                                }
                                className="w-full p-2 bg-gray-600 rounded"
                            >
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1">1x</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="1.75">1.75x</option>
                                <option value="2">2x</option>
                                <option value="2.5">2.5x</option>
                                <option value="3">3x</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2">Voice</label>
                            <select
                                value={preferences.voice}
                                onChange={(e) =>
                                    setPreferences((prev) => ({
                                        ...prev,
                                        voice: e.target.value,
                                    }))
                                }
                                className="w-full p-2 bg-gray-600 rounded"
                            >
                                {/* Default voice first */}
                                {bestVoice && (
                                    <>
                                        <option
                                            key={bestVoice.name}
                                            value={bestVoice.name}
                                        >
                                            {bestVoice.name}
                                            {!bestVoice.name.includes("[") &&
                                            !bestVoice.name.includes("(")
                                                ? ` (${getReadableLanguageName(bestVoice.lang)})`
                                                : ""}
                                            {" (default)"}
                                        </option>
                                        <option
                                            disabled
                                            className="border-t border-gray-500"
                                        >
                                            ──────────
                                        </option>
                                    </>
                                )}
                                {/* Rest of the voices */}
                                {voices
                                    .filter(
                                        (voice) =>
                                            voice.name !== bestVoice?.name,
                                    )
                                    .map((voice) => {
                                        const hasLanguageInName =
                                            voice.name.includes("[") ||
                                            voice.name.includes("(");

                                        return (
                                            <option
                                                key={voice.name}
                                                value={voice.name}
                                            >
                                                {voice.name}
                                                {!hasLanguageInName
                                                    ? ` (${getReadableLanguageName(voice.lang)})`
                                                    : ""}
                                            </option>
                                        );
                                    })}
                            </select>
                        </div>

                        <Dialog.Close asChild>
                            <button className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">
                                Close
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="p-2 hover:bg-gray-700 rounded">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        side="top"
                        align="end"
                        className="bg-gray-200 text-gray-900 rounded-lg shadow-lg py-1 w-32 z-50" // Added z-50
                    >
                        <DropdownMenu.Item
                            onClick={clearHistory}
                            className="w-full px-4 py-2 text-left hover:bg-gray-300 text-sm outline-none cursor-pointer"
                        >
                            Clear History
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </>
    );

    const historySection = historyItems.map((item) => (
        <div
            key={item.id}
            className="p-2 mb-2 bg-gray-700 rounded-lg text-gray-100 relative"
        >
            <div className="pr-8">{item.text}</div>
            <button
                onClick={() => speak(item.text, item.id)}
                className="absolute top-2 right-2 p-1 hover:bg-gray-600 rounded"
            >
                {currentlyPlaying === item.id ? (
                    <Square className="w-4 h-4" />
                ) : (
                    <Play className="w-4 h-4" />
                )}
            </button>
        </div>
    ));

    return (
        <div className="bg-gray-800 text-gray-100 min-h-screen">
            {/* Mobile layout */}
            <div className="md:hidden flex flex-col h-screen">
                <div className="border-b border-gray-700 sticky top-0 bg-gray-800 z-20">
                    <div className="w-full max-w-2xl p-4 flex items-center space-x-2 mx-auto">
                        {inputSection}
                    </div>
                </div>
                <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                    <div className="flex flex-col items-center">
                        <div className="w-full max-w-2xl p-4 flex flex-col">
                            {historySection}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex flex-col h-screen">
                <div
                    ref={scrollContainerRef}
                    className="overflow-auto flex-1 flex flex-col justify-end"
                >
                    <div className="flex flex-col items-center">
                        <div className="w-full max-w-2xl p-4 flex flex-col-reverse">
                            {historySection}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center border-t border-gray-700">
                    <div className="w-full max-w-2xl p-4 flex items-center space-x-2">
                        {inputSection}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
