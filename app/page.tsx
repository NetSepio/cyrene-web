'use client'

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUp, Volume2, VolumeX, Mic, MicOff, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import VoiceManager from '@/utils/voiceUtils';
import { useWallet } from '@solana/wallet-adapter-react';
import { Textarea } from "@/components/ui/textarea";


interface Message {
  isUser: boolean;
  text: string;
  audio?: string | null;
}

// Mock responses for testing
const mockResponses = [
  "Hello! I'm doing great, thank you for asking. I'm here to help you explore the fascinating world of AI and technology. What would you like to know?",
  "I'm a multi-talented AI assistant with expertise in cybersecurity, blockchain, and decentralized systems. I can help with technical questions, provide guidance on various topics, and even engage in natural conversations with voice responses.",
  "That's a great question! I specialize in natural language processing, voice synthesis, and understanding complex technical concepts. I can help explain difficult topics in simple terms.",
  "I'd be happy to help you with that. My knowledge spans across various domains including AI, machine learning, cybersecurity, and blockchain technology."
];

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: number]: boolean }>({});
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const voiceManager = useRef(new VoiceManager());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<string>("")
  const { publicKey, disconnect } = useWallet();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const agent = {
    name: "cyrene",
    image: "/cyrene_profile.png"
  };







  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    const storedWalletAddress = localStorage.getItem("walletAddress");
    if (storedWalletAddress) {
      setWalletAddress(storedWalletAddress);
    }


  }, []);



  useEffect(() => {
    if (publicKey) {
      const address = publicKey.toBase58();
      localStorage.setItem('walletAddress', address);

      setWalletAddress(address);
      setUser(address)

    }
  }, [publicKey]);

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (text: string, user: string, forceVoiceMode?: boolean) => {

    console.log("clicked")
    if (!text.trim() || isLoading) return;

    setIsLoading(true)
    setTranscription('')

    // Immediately show user message
    const userMessageIndex = messages.length
    setMessages(prev => [...prev, { isUser: true, text }])
    setInputValue('')

    try {
      let responseText: string
      let audioUrl: string | null = null

      // Use forced voice mode or current state
      const useVoiceMode = forceVoiceMode || isVoiceMode;
      console.log('Voice mode status:', { forced: forceVoiceMode, current: isVoiceMode, using: useVoiceMode });

      // Get the message response





      const formData = new FormData();
      formData.append('text', text);
      formData.append('userId', user);
      formData.append('voice_mode', useVoiceMode.toString());


      if (agent.name === "cyrene") {
        const response = await fetch(`/api/chatCyrene`, {
          method: 'POST',
          body: formData
        })
        if (!response.ok) {
          console.error('Response error:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url
          });
          throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
        }
        const data = await response.json()
        responseText = data[0].text
        // Then generate voice if in voice mode


        if (useVoiceMode) {
          console.log('Voice mode active, generating voice for:', responseText);

          try {
            audioUrl = await voiceManager.current.generateVoice(responseText);
            console.log('Voice generation result:', audioUrl ? 'success' : 'failed');
            if (audioUrl) {
              console.log('Playing audio...');
              const audio = new Audio(audioUrl);
              await audio.play().catch(err => console.error('Audio playback error:', err));
            } else {
              console.error('Voice generation returned null')
            }
          } catch (error) {
            console.error('Voice generation error:', error)
          }
        }

        // Add AI response
        if (!useVoiceMode || audioUrl) {
          setMessages(prev => [
            ...prev,
            { isUser: false, text: responseText, audio: audioUrl }
          ])
        }
      }

    } catch (error) {
      console.error('Error in handleSubmit:', error);

      setMessages(prev => prev.filter((_, i) => i !== userMessageIndex))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      voiceManager.current.stopListening()
      setIsRecording(false)
      return
    }

    setIsRecording(true)
    voiceManager.current.startListening(
      async text => {
        setTranscription(text)
        // Force voice mode to be true for voice input
        const forceVoiceMode = true;
        await handleSubmit(text, user, forceVoiceMode);
      },
      () => setIsRecording(false)
    )
  }

  const exitVoiceMode = () => {
    setIsVoiceMode(false)
    setIsRecording(false)
    voiceManager.current.stopListening()
  }

  const toggleAudio = (index: number) => {
    const audio = audioRefs.current[index]
    if (!audio) return

    if (isPlayingAudio[index]) {
      audio.pause()
      setIsPlayingAudio(prev => ({ ...prev, [index]: false }))
    } else {
      audio.play()
      setIsPlayingAudio(prev => ({ ...prev, [index]: true }))
    }
  }

  const toggleVoiceMode = async () => {
    if (isVoiceMode) {
      exitVoiceMode()
    } else {
      // Set voice mode first
      await new Promise<void>(resolve => {
        setIsVoiceMode(true)
        setInputValue('')
        resolve()
      })

      // Start listening after state is updated
      setIsRecording(true)
      voiceManager.current.startListening(
        async text => {
          setTranscription(text)
          // Force voice mode to be true for first message
          const forceVoiceMode = true;
          await handleSubmit(text, user, forceVoiceMode);
        },
        () => setIsRecording(false)
      )
    }
  }












  return (
    <>
      <div className="relative w-full h-[500px] md:h-[742px]">
        {/* Background Video */}
        <video
          src="Cyrene video hero for Topaz_apo8.mp4" // Place your video inside the "public" folder
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0F1A2E]/90" />

        {/* Centered Main Text (Responsive) */}
        <div className="absolute inset-0 flex flex-col gap-8 items-center justify-center text-center px-4">
          <h1
            className="text-3xl sm:text-4xl md:text-[55px] font-light text-white tracking-tight max-w-full"
            style={{
              fontFamily: "DM Sans",
              textShadow: "0 0 20px rgba(79, 172, 254, 0.5)"
            }}
          >
            Journey with Cyrene into the Agentic Future
          </h1>
          <a
            href="/launch-agent"
            className="px-6 py-3 text-lg md:text-xl font-medium text-black bg-white rounded-full border-white shadow-lg transition-all duration-300 "
          >
            Launch Agent
          </a>
        </div>

        {/* Bottom Text with Semi-Transparent Gradient */}
        <div className="absolute bottom-0 w-full bg-gradient-to-r from-[#4C8AEC]/40 to-[#424F7F]/40 text-center py-4 sm:py-6 md:py-8">
          <p className="text-lg sm:text-xl md:text-[24px] font-normal font-sans text-white">
            Multi-Agent Platform and AI Coordination layer on secure network powered by NetSepio
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 " id="target-section" >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className='flex flex-col items-center'
        >
          <h1
            className='text-3xl sm:text-4xl md:text-5xl text-white font-medium mb-12 sm:mb-16'
            style={{
              fontFamily: 'PingFang SC',
              textShadow: '0 0 20px rgba(79, 172, 254, 0.3)'
            }}
          >
            Hi, I&apos;m {agent.name.charAt(0).toUpperCase() + agent.name.slice(1)}
          </h1>

          <div className='relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 mb-8'>
            <Image
              src={agent.image}
              alt='Cyrene AI'
              className='object-cover rounded-3xl'
              width={400}
              height={400}
            />
          </div>

          <div className='w-full max-w-xl flex flex-col items-center'>
            {/* Messages List */}
            <div className='w-full flex-1 min-h-0'>
              {messages.length > 0 && (
                <div
                  ref={messagesContainerRef}
                  className='w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 pr-2 mb-6'
                >
                  <div className='w-full space-y-4'>
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'
                          }`}
                      >
                        {!message.isUser && (
                          <Image
                            src={agent.image || '/cyrene_chat.png'}
                            alt='cyrene_chat'
                            className='w-14 h-14 rounded-lg object-cover mr-2'
                            width={75}
                            height={77}
                          />
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 sm:p-5 backdrop-blur-sm border
                            ${message.isUser
                              ? 'bg-blue-500/20 border-blue-500/30 rounded-tr-sm'
                              : 'bg-white/5 border-white/10 rounded-tl-sm'
                            }`}
                        >

                          <div className="flex items-start gap-3">
                            {!message.isUser && message.audio && (
                              <button
                                onClick={() => toggleAudio(index)}
                                className={`mt-1 transition-colors ${isPlayingAudio[index]
                                    ? 'text-blue-400'
                                    : 'text-white/60 hover:text-white/90'
                                  }`}
                              >
                                {isPlayingAudio[index] ? (
                                  <VolumeX className='w-5 h-5' />
                                ) : (
                                  <Volume2 className='w-5 h-5' />
                                )}
                              </button>
                            )}
                            <p className='text-white/90 text-sm sm:text-base flex-1'>
                              {message.text}
                            </p>
                          </div>
                          {message.audio && (
                            <audio
                              ref={el => {
                                if (el) audioRefs.current[index] = el
                              }}
                              src={message.audio}
                              onEnded={() =>
                                setIsPlayingAudio(prev => ({
                                  ...prev,
                                  [index]: false
                                }))
                              }
                              className='hidden'
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Voice Mode UI */}
            {isVoiceMode ? (
              <div className='w-full flex flex-col items-center gap-6 mb-6'>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='relative w-32 h-32 flex items-center justify-center'
                >
                  <motion.div
                    animate={{
                      scale: isRecording ? [1, 1.2, 1] : 1,
                      opacity: isRecording ? [0.2, 0.5, 0.2] : 0.2
                    }}
                    transition={{
                      repeat: isRecording ? Infinity : 0,
                      duration: 1.5
                    }}
                    className='absolute inset-0 bg-blue-500 rounded-full'
                  />
                  <motion.div
                    animate={{
                      scale: isRecording ? [1, 1.1, 1] : 1,
                      opacity: isRecording ? [0.15, 0.3, 0.15] : 0.15
                    }}
                    transition={{
                      repeat: isRecording ? Infinity : 0,
                      duration: 1.5,
                      delay: 0.2
                    }}
                    className='absolute inset-2 bg-blue-500 rounded-full'
                  />
                  <button
                    onClick={handleVoiceInput}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording
                        ? 'bg-blue-500 text-white hover:bg-blue-600 scale-110'
                        : 'bg-white/5 text-white/60 hover:text-blue-500 hover:bg-white/10'
                      }`}
                  >
                    {isRecording ? (
                      <Mic className='w-8 h-8' />
                    ) : (
                      <MicOff className='w-8 h-8' />
                    )}
                  </button>
                </motion.div>
                {transcription && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='text-white/60 text-sm text-center max-w-md'
                  >
                    {transcription}
                  </motion.p>
                )}
                <button
                  onClick={exitVoiceMode}
                  className='text-white/40 hover:text-white/60 transition-colors flex items-center gap-2'
                >
                  <X className='w-4 h-4' />
                  <span>Exit Voice Mode</span>
                </button>
              </div>
            ) : null}

            {/* Input Form with Loading Indicator */}
            <div className="w-full sticky bottom-0  to-transparent pt-4 mb-32">
              <div className="relative">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(inputValue, user);
                  }}
                  className="relative w-full"
                >
                  <Textarea
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      e.target.style.height = "auto"; // Reset height first
                      e.target.style.height = `${e.target.scrollHeight}px`; // Expand dynamically
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault(); // Prevent new line
                        if (inputValue.trim()) {
                          handleSubmit(inputValue, user); // Submit form
                          setInputValue(""); // Clear input after submit
                        }
                      }
                    }}
                    placeholder={isVoiceMode ? "Listening..." : `Ask ${agent.name}...`}
                    disabled={isLoading || isRecording}
                    className="w-full bg-white/5 backdrop-blur-sm text-white placeholder-white/40 rounded-2xl px-6 py-4 sm:py-5 pr-32 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none overflow-hidden"
                    rows={1} // Initial height
                  />


                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-3">
                    <button
                      type='button'
                      onClick={toggleVoiceMode}
                      className={`p-2 rounded-full transition-colors ${isVoiceMode
                          ? "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                          : "hover:bg-white/10 text-white/40 hover:text-blue-500"
                        }`}
                    >
                      {isVoiceMode ? (
                        <X className='w-5 h-5' />
                      ) : (
                        <Mic className='w-5 h-5' />
                      )}
                    </button>
                    <button
                      type='submit'
                      disabled={isLoading || !inputValue.trim()}
                      className='p-2 rounded-full hover:bg-white/10'
                    >
                      <ArrowUp
                        className={`w-5 h-5 transition-colors ${inputValue && !isLoading ? "text-blue-500" : "text-white/40"
                          }`}
                      />
                    </button>
                  </div>
                </form>

                {/* Loading Indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='absolute -top-8 left-1/2 -translate-x-1/2 flex gap-2 justify-center'
                  >
                    <div className="w-2 h-2 bg-blue-500/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-blue-500/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-blue-500/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Always here for you text */}
      <div className='absolute mt-60 w-full text-center px-4 sm:px-6 lg:px-8'>
        <p
          className='text-2xl sm:text-3xl md:text-4xl text-white/90'
          style={{
            fontFamily: 'PingFang SC',
            textShadow: '0 0 20px rgba(79, 172, 254, 0.3)'
          }}
        >
          Always here for you.
        </p>
      </div>
    </>
  );
}