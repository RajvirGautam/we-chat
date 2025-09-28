import React, { useEffect, useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import io from "socket.io-client";
import { Send, Phone, Video, MoreVertical } from "lucide-react";
import "../styles/Chatuser.css";

const socket = io("http://localhost:3000");

export default function ChatUser({ receiverId }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem("token");
  const userId = jwtDecode(token).id; 
  console.log("Joining with userId:", userId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load dark mode preference
  useEffect(() => {
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(darkMode);
  }, []);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    socket.emit("join", { userId });

    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("typing", () => {
      setTyping(true);
      setTimeout(() => setTyping(false), 3000);
    });

    return () => {
      socket.off("receive_message");
      socket.off("typing");
    };
  }, [receiverId]);

  useEffect(() => {
    socket.on("online_users", (onlineUserIds) => {
      console.log("Online users:", onlineUserIds);
      setOnlineUsers(onlineUserIds); 
    });

    return () => {
      socket.off("online_users");
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    const data = { senderId: userId, receiverId, message };
    socket.emit("send_message", data);
    setMessages((prev) => [...prev, data]);
    setMessage("");
  };

  const handleTyping = () => {
    socket.emit("typing", { receiverId });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOnline = onlineUsers.includes(receiverId.toString());

  return (
    <div className={`chatuser-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Chat Header */}
      <div className="chatuser-header">
        <div className="friend-info">
          <div className="friend-avatar">
            <div className={`avatar-circle ${isOnline ? 'online' : 'offline'}`}>
              <span>👤</span>
              <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
            </div>
          </div>
          <div className="friend-details">
            <h3 className="friend-name">Friend</h3>
            <div className="friend-status">
              {isOnline ? (
                <span className="status-online">🟢 Online</span>
              ) : (
                <span className="status-offline">⚪ Last seen recently</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          <button className="action-btn" title="Voice call">
            <Phone size={18} />
          </button>
          <button className="action-btn" title="Video call">
            <Video size={18} />
          </button>
          <button className="action-btn" title="More options">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        <div className="messages-wrapper">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-icon">💬</div>
              <h4>Start your conversation</h4>
              <p>Send a message to begin chatting with your friend</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isYou = msg.senderId === userId;
                const showTime = index === 0 || 
                  (messages[index - 1] && 
                   new Date(msg.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000);
                
                return (
                  <div key={index} className="message-group">
                    {showTime && (
                      <div className="time-separator">
                        <span>{formatTime(msg.timestamp || new Date())}</span>
                      </div>
                    )}
                    <div className={`message-row ${isYou ? 'sent' : 'received'}`}>
                      {!isYou && (
                        <div className="message-avatar">
                          <span>👤</span>
                        </div>
                      )}
                      <div className="message-bubble">
                        <div className="message-content">
                          <div className="message-header">
                            <span className="sender-name">
                              {isYou ? "You" : "Friend"}
                            </span>
                          </div>
                          <div className="message-text">
                            {msg.message}
                          </div>
                        </div>
                        <div className="message-meta">
                          <span className="message-time">
                            {formatTime(msg.timestamp || new Date())}
                          </span>
                          {isYou && (
                            <span className="message-status">
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                      {isYou && (
                        <div className="message-avatar sent">
                          <span>😊</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          
          {typing && (
            <div className="message-row received">
              <div className="message-avatar">
                <span>👤</span>
              </div>
              <div className="message-bubble typing-bubble">
                <div className="typing-indicator">
                  <span>Friend is typing</span>
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-container">
          <div className="message-input-wrapper">
            <textarea
              ref={inputRef}
              className="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              rows="1"
              maxLength={1000}
            />
            <div className="input-actions">
              {message.trim() && (
                <span className="char-count">
                  {message.length}/1000
                </span>
              )}
              <button 
                className="send-btn"
                onClick={sendMessage}
                disabled={!message.trim()}
                title="Send message"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="input-hint">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};
