
import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'textarea';
  className?: string;
  required?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ value, onChange, placeholder, type = 'text', className, required }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialValueRef = useRef<string | number>('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'it-IT';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        // Appendiamo il trascritto al valore iniziale per non cancellare il testo precedente
        const baseValue = initialValueRef.current.toString();
        let newValue = baseValue + (baseValue.length > 0 && !baseValue.endsWith(' ') ? ' ' : '') + transcript;
        
        // Se è un numero, cerchiamo di estrarre solo le cifre
        if (type === 'number') {
          newValue = newValue.replace(/[^0-9]/g, '');
        }
        
        onChange(newValue);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onChange, type]);

  const startListening = (e: React.MouseEvent) => {
    if (e.button !== 0) return; 
    if (recognitionRef.current && !isListening) {
      // Memorizziamo il valore attuale prima di iniziare a sentire
      initialValueRef.current = value === 0 ? '' : value;
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Rimuoviamo lo zero iniziale per i campi numerici se l'utente clicca
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (type === 'number' && value === 0) {
      onChange('');
    }
  };

  const commonProps = {
    value: value === 0 && type === 'number' ? '' : value,
    onChange: (e: any) => onChange(e.target.value),
    onFocus: handleFocus,
    onMouseDown: startListening,
    onMouseUp: stopListening,
    onMouseLeave: stopListening,
    placeholder: isListening ? 'Ascoltando...' : placeholder,
    required,
    className: `${className} ${isListening ? 'ring-4 ring-indigo-400 bg-indigo-50 animate-pulse' : ''} transition-all duration-200 cursor-pointer`
  };

  if (type === 'textarea') {
    return <textarea {...commonProps} rows={3} />;
  }

  return <input type={type === 'number' ? 'text' : type} {...commonProps} />;
};
