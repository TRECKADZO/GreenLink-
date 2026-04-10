import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Smartphone, Send, RotateCcw, Phone, Signal,
  Battery, Wifi, ChevronLeft, Users, Search
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function USSDSimulator({ title, onClose, members }) {
  const defaultTitle = title || "Simulateur USSD";
  const membersList = members || [];
  
  const [sessionId] = useState(() => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 8);
    return `sim_${timestamp}_${randomStr}`;
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [memberSearch, setMemberSearch] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  useEffect(() => {
    if (started && inputRef.current) {
      inputRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, history]);

  const sendUSSD = async (text) => {
    const textValue = text || '';
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ussd/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          serviceCode: '*144*99#',
          phoneNumber: phoneNumber,
          text: textValue
        })
      });
      const data = await res.json();
      
      if (textValue) {
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory.push({ type: 'user', text: textValue });
          return newHistory;
        });
      }
      
      const rawResponse = data.raw_response;
      const textResponse = data.text ? data.text.replace(/^(CON |END )/, '') : null;
      const responseText = rawResponse || textResponse || 'Erreur';
      
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory.push({ type: 'system', text: responseText });
        return newHistory;
      });
      
      if (!data.continue_session) {
        setSessionEnded(true);
      }
    } catch (error) {
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory.push({ type: 'error', text: 'Erreur de connexion au serveur' });
        return newHistory;
      });
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleStart = () => {
    if (!phoneNumber || phoneNumber.length < 8) return;
    setStarted(true);
    setHistory([]);
    setSessionEnded(false);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2, 8);
    const newSid = `sim_${timestamp}_${randomStr}`;
    setCurrentSessionId(newSid);
    setTimeout(() => sendUSSD(''), 100);
  };

  const handleSend = (e) => {
    if (e) {
      e.preventDefault();
    }
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || sessionEnded) return;
    sendUSSD(trimmedInput);
  };

  const handleQuickInput = (value) => {
    if (loading || sessionEnded) return;
    sendUSSD(value);
  };

  const handleRestart = () => {
    setStarted(false);
    setHistory([]);
    setSessionEnded(false);
    setInput('');
  };

  // Extract menu options from last system message for quick buttons
  const quickOptions = useMemo(() => {
    const options = [];
    const reversedHistory = [...history].reverse();
    const lastSystemMsg = reversedHistory.find(h => h.type === 'system');
    
    if (lastSystemMsg && !sessionEnded) {
      const lines = lastSystemMsg.text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\d)\.\s+(.+)/);
        if (match) {
          const value = match[1];
          const labelText = match[2];
          const label = labelText.substring(0, 30);
          options.push({ value: value, label: label });
        }
      }
    }
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, sessionEnded]);

  const hasMembersList = membersList.length > 0;
  
  const filteredMembers = useMemo(() => {
    if (!hasMembersList) return [];
    const search = memberSearch.toLowerCase();
    return membersList.filter(m => {
      const fullName = m.full_name || '';
      const phoneNum = m.phone_number || '';
      const village = m.village || '';
      const codePlanteur = m.code_planteur || '';
      
      return fullName.toLowerCase().includes(search) ||
             phoneNum.includes(search) ||
             village.toLowerCase().includes(search) ||
             codePlanteur.toLowerCase().includes(search);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersList, memberSearch, hasMembersList]);

  const selectMember = (member) => {
    const phone = member.phone_number || '';
    setPhoneNumber(phone);
    setMemberSearch('');
  };

  if (!started) {
    return (
      <Card className="bg-gray-900 border-gray-700 max-w-sm mx-auto" data-testid="ussd-simulator">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" /> 
              <span>{defaultTitle}</span>
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white h-7 w-7 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-3">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Phone className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-300 mb-1">Simulez l'experience USSD</p>
            <p className="text-xs text-gray-500">
              {hasMembersList ? 'Selectionnez un membre pour tester le flux *144*99#' : 'Testez le flux *144*99# comme un planteur'}
            </p>
          </div>

          {hasMembersList ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Users className="w-3 h-3" /> 
                <span>Selectionnez un membre ({membersList.length})</span>
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Rechercher nom, tel, village..."
                  className="bg-gray-800 border-gray-600 text-white text-sm pl-8 h-9"
                  data-testid="ussd-sim-member-search"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg">
                {filteredMembers.slice(0, 20).map((m, i) => {
                  const isSelected = phoneNumber === m.phone_number;
                  const buttonClass = isSelected
                    ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
                    : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300 border border-transparent';
                  
                  return (
                    <button
                      key={`el-${i}`}
                      onClick={() => selectMember(m)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${buttonClass}`}
                      data-testid={`ussd-sim-member-${i}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{m.full_name}</span>
                        {m.code_planteur && (
                          <span className="text-[10px] text-gray-500 ml-1">{m.code_planteur}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{m.phone_number || 'Pas de tel'}</span>
                        {m.village && (
                          <span className="text-[10px] text-gray-600">- {m.village}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-3">Aucun membre trouve</p>
                )}
              </div>
              {phoneNumber && (
                <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-emerald-400">Membre selectionne :</p>
                  <p className="text-sm text-white font-mono">{phoneNumber}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Numero de telephone du planteur</label>
              <Input
                data-testid="ussd-sim-phone-input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+2250700000000"
                className="bg-gray-800 border-gray-600 text-white text-center text-lg tracking-wider"
              />
            </div>
          )}

          <Button 
            data-testid="ussd-sim-start-btn"
            onClick={handleStart}
            disabled={!phoneNumber || phoneNumber.length < 8}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            <Phone className="w-4 h-4 mr-2" /> 
            <span>Composer *144*99#</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-950 border-gray-700 max-w-sm mx-auto overflow-hidden" data-testid="ussd-simulator-active">
      {/* Phone status bar */}
      <div className="bg-gray-900 px-4 py-1.5 flex items-center justify-between text-gray-400 text-[10px]">
        <div className="flex items-center gap-1.5">
          <Signal className="w-3 h-3" />
          <span>Orange CI</span>
        </div>
        <span className="font-mono">*144*99#</span>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          <Battery className="w-3 h-3" />
        </div>
      </div>

      {/* Chat area */}
      <div className="h-[380px] overflow-y-auto p-3 space-y-2 bg-gray-950" data-testid="ussd-sim-chat">
        {history.map((msg, i) => {
          let msgClass = 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700';
          if (msg.type === 'user') {
            msgClass = 'bg-emerald-600 text-white rounded-br-none';
          } else if (msg.type === 'error') {
            msgClass = 'bg-red-900/50 text-red-300 border border-red-800';
          }
          
          return (
            <div key={`el-${i}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msgClass}`}
                data-testid={`ussd-sim-msg-${i}`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick options */}
      {quickOptions.length > 0 && !sessionEnded && (
        <div className="px-3 py-2 bg-gray-900/80 border-t border-gray-800 flex flex-wrap gap-1.5">
          {quickOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleQuickInput(opt.value)}
              disabled={loading}
              className="px-2.5 py-1 text-xs bg-gray-800 hover:bg-emerald-600/30 text-gray-300 hover:text-emerald-300 rounded-full border border-gray-700 hover:border-emerald-600/50 transition-colors disabled:opacity-50"
              data-testid={`ussd-sim-quick-${opt.value}`}
            >
              {opt.value}. {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 bg-gray-900 border-t border-gray-800">
        {sessionEnded ? (
          <Button 
            data-testid="ussd-sim-restart-btn"
            onClick={handleRestart} 
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> 
            <span>Nouvelle session</span>
          </Button>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              ref={inputRef}
              data-testid="ussd-sim-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tapez votre reponse..."
              disabled={loading}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 flex-1"
              autoComplete="off"
            />
            <Button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 px-3"
              data-testid="ussd-sim-send-btn"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}

export default USSDSimulator;
