'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  LayoutTemplate,
  ListTodo,
  Menu,
  MessageSquare,
  Plus,
  Rocket,
  Search,
  Send,
  Sparkles,
  Target,
  Wand2,
  Globe,
  Mail,
  Phone,
  KanbanSquare,
} from 'lucide-react';

const conversations = [
  {
    id: 1,
    title: 'Funil para eBook de produtividade',
    updatedAt: 'Atualizado há 5 min',
    status: 'Em andamento',
  },
  {
    id: 2,
    title: 'Campanha WhatsApp Black Friday',
    updatedAt: 'Atualizado há 25 min',
    status: 'Concluído',
  },
  {
    id: 3,
    title: 'Landing page para consultoria',
    updatedAt: 'Ontem',
    status: 'Concluído',
  },
  {
    id: 4,
    title: 'Fluxo de recuperação de leads',
    updatedAt: '2 dias atrás',
    status: 'Pausado',
  },
];

const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    content:
      'Olá. Eu sou o Ximples. Posso criar sua landing page, sua campanha, suas mensagens e organizar tudo em marcos simples. Me diga o que você quer vender ou lançar.',
    time: '09:10',
  },
  {
    id: 2,
    role: 'user',
    content: 'Quero vender um ebook de emagrecimento com página, email e WhatsApp.',
    time: '09:11',
  },
  {
    id: 3,
    role: 'assistant',
    content: 'Perfeito. Estou criando tudo para você agora.',
    time: '09:11',
  },
];

const milestones = [
  { id: 1, name: 'Landing criada', completed: true, icon: Globe },
  { id: 2, name: 'Funil criado', completed: true, icon: LayoutTemplate },
  { id: 3, name: 'Campanha ativa', completed: true, icon: Rocket },
  { id: 4, name: 'Leads chegando', completed: false, icon: Target },
];

const assets = [
  { id: 1, name: 'Landing Page #1', type: 'Landing', created: '5 min atrás', icon: Globe },
  { id: 2, name: 'Campanha WhatsApp #2', type: 'WhatsApp', created: '10 min atrás', icon: Phone },
  { id: 3, name: 'Funil Ebook Emagrecimento', type: 'Funil', created: '15 min atrás', icon: LayoutTemplate },
  { id: 4, name: 'Lista de Leads', type: 'CRM', created: '20 min atrás', icon: ListTodo },
];

export default function XimplesApp() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInput('');

    setTimeout(() => {
      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: 'Estou processando sua solicitação...',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  const progressPercentage = useMemo(() => {
    const completed = milestones.filter((m) => m.completed).length;
    return (completed / milestones.length) * 100;
  }, []);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SheetDescription className="sr-only">Menu de conversas e opções</SheetDescription>
          <SidebarContent
            conversations={conversations}
            selectedConversation={selectedConversation}
            setSelectedConversation={setSelectedConversation}
            setSidebarOpen={setSidebarOpen}
          />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex md:flex-col md:w-64 border-r border-gray-200">
        <SidebarContent
          conversations={conversations}
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Ximples"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ximples</h1>
                <p className="text-sm text-gray-600">Seu marketing feito por você. Só que sem você.</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 md:p-6 bg-gray-50">
            <div className="space-y-4 max-w-2xl">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-blue-600 text-white">X</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4 md:p-6">
            <div className="flex gap-2 max-w-2xl">
              <Textarea
                placeholder="Me diga o que você quer criar. Ex: 'Quero vender um curso de inglês'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSendMessage();
                  }
                }}
                className="resize-none"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Milestones and Assets */}
        <div className="hidden lg:flex lg:flex-col lg:w-80 border-l border-gray-200 bg-gray-50 overflow-hidden">
          <Tabs defaultValue="milestones" className="w-full h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b border-gray-200 bg-white">
              <TabsTrigger value="milestones" className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcos
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Ativos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="milestones" className="flex-1 p-4 overflow-auto">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Progresso</span>
                    <span className="text-xs font-medium text-gray-600">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                <div className="space-y-3">
                  {milestones.map((milestone) => {
                    const IconComponent = milestone.icon;
                    return (
                      <div key={milestone.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        {milestone.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Clock3 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {milestone.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assets" className="flex-1 p-4 overflow-auto">
              <div className="space-y-3">
                {assets.map((asset) => {
                  const IconComponent = asset.icon;
                  return (
                    <div key={asset.id} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition">
                      <div className="flex items-start gap-3">
                        <IconComponent className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{asset.type}</p>
                          <p className="text-xs text-gray-500 mt-1">{asset.created}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ conversations, selectedConversation, setSelectedConversation, setSidebarOpen }) {
  return (
    <>
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Image
            src="/logo.png"
            alt="Ximples"
            width={32}
            height={32}
            className="rounded"
          />
          <div>
            <h2 className="font-bold text-gray-900">ximples</h2>
            <p className="text-xs text-gray-600">operador de marketing</p>
          </div>
        </div>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Nova conversa
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                setSelectedConversation(conv);
                setSidebarOpen(false);
              }}
              className={`p-3 rounded-lg cursor-pointer transition ${
                selectedConversation?.id === conv.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-100 border border-transparent'
              }`}
            >
              <p className="text-sm font-medium text-gray-900 truncate">{conv.title}</p>
              <div className="flex items-center justify-between mt-1 gap-2">
                <p className="text-xs text-gray-600">{conv.updatedAt}</p>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    conv.status === 'Concluído'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : conv.status === 'Em andamento'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  {conv.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-gray-200 bg-white space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-2 text-gray-700">
          <MessageSquare className="w-4 h-4" />
          Suporte
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-gray-700">
          <Sparkles className="w-4 h-4" />
          Planos
        </Button>
      </div>
    </>
  );
}
