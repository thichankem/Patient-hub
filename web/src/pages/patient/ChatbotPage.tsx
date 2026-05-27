import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';

type Mode = 'symptoms' | 'library';

interface Department {
  id: string;
  name: string;
  description?: string | null;
}

interface SymptomResult {
  needs_hospital: boolean;
  suggested_department: Department | null;
  disease_name: string | null;
  advice: string | null;
}

interface Doctor {
  id: string;
  full_name: string;
  department_id: string;
}

interface ChatMessage {
  id: string;
  from: 'bot' | 'user';
  content: React.ReactNode;
}

type Step =
  | { kind: 'idle' }
  | { kind: 'symptom_result'; result: SymptomResult }
  | { kind: 'pick_date'; department: Department }
  | { kind: 'doctor_suggested'; department: Department; date: string; doctor: Doctor }
  | { kind: 'confirmed'; appointmentId: string };

const LIB_LABEL: Record<string, string> = {
  disease: 'bệnh',
  medicine: 'thuốc',
  procedure: 'quy trình khám',
  test_type: 'xét nghiệm',
};

export default function ChatbotPage() {
  const [mode, setMode] = useState<Mode>('symptoms');
  const [libTopic, setLibTopic] = useState<'disease' | 'medicine' | 'procedure' | 'test_type'>(
    'disease',
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      from: 'bot',
      content: (
        <div>
          <p className="font-medium">Xin chào! Tôi là trợ lý đặt lịch khám.</p>
          <p className="mt-1 text-sm">
            Bạn vui lòng mô tả triệu chứng đang gặp phải, tôi sẽ tư vấn và giúp bạn đặt lịch với bác
            sĩ phù hợp.
          </p>
        </div>
      ),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, step]);

  function pushMsg(m: Omit<ChatMessage, 'id'>) {
    setMessages((prev) => [...prev, { ...m, id: crypto.randomUUID() }]);
  }

  async function handleSymptoms(text: string) {
    setLoading(true);
    try {
      const res = await api.get<{ data: SymptomResult }>('/chatbot/symptoms', {
        params: { symptoms: text },
      });
      const r = res.data.data;
      if (!r.needs_hospital) {
        pushMsg({
          from: 'bot',
          content: (
            <div>
              <p>Theo phân tích, triệu chứng của bạn có thể chăm sóc tại nhà.</p>
              {r.advice && <p className="mt-2 text-sm whitespace-pre-line">{r.advice}</p>}
              <p className="mt-2 text-sm text-slate-500">
                Nếu triệu chứng nặng hơn, vui lòng mô tả thêm để tôi tư vấn lại.
              </p>
            </div>
          ),
        });
        setStep({ kind: 'idle' });
      } else if (r.suggested_department) {
        pushMsg({
          from: 'bot',
          content: (
            <div>
              <p>
                Dựa trên triệu chứng, tôi gợi ý bạn nên khám tại khoa{' '}
                <strong className="text-brand-700">{r.suggested_department.name}</strong>
                {r.disease_name && (
                  <>
                    {' '}
                    (nghi ngờ: <em>{r.disease_name}</em>)
                  </>
                )}
                .
              </p>
              {r.advice && <p className="mt-2 text-sm whitespace-pre-line">{r.advice}</p>}
              <p className="mt-3 text-sm">Bạn có đồng ý đặt lịch tại khoa này không?</p>
            </div>
          ),
        });
        setStep({ kind: 'symptom_result', result: r });
      }
    } catch (err) {
      pushMsg({ from: 'bot', content: <span className="text-red-600">{apiErrorMessage(err)}</span> });
    } finally {
      setLoading(false);
    }
  }

  async function handleLibrary(q: string) {
    setLoading(true);
    try {
      const res = await api.get<{ data: Array<{ id: string; name: string; description?: string }> }>(
        '/chatbot/library',
        { params: { topic: libTopic, q } },
      );
      const data = res.data.data;
      if (data.length === 0) {
        pushMsg({
          from: 'bot',
          content: <p>Không tìm thấy {LIB_LABEL[libTopic]} phù hợp với từ khóa "{q}".</p>,
        });
      } else {
        pushMsg({
          from: 'bot',
          content: (
            <div className="space-y-2">
              <p>
                Tìm thấy <strong>{data.length}</strong> kết quả về {LIB_LABEL[libTopic]}:
              </p>
              {data.slice(0, 5).map((it) => (
                <div key={it.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="font-medium text-slate-900">{it.name}</div>
                  {it.description && (
                    <div className="text-sm text-slate-600 mt-1 line-clamp-3">{it.description}</div>
                  )}
                </div>
              ))}
            </div>
          ),
        });
      }
    } catch (err) {
      pushMsg({ from: 'bot', content: <span className="text-red-600">{apiErrorMessage(err)}</span> });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    pushMsg({ from: 'user', content: <span>{text}</span> });
    if (mode === 'symptoms') {
      await handleSymptoms(text);
    } else {
      await handleLibrary(text);
    }
  }

  async function confirmDepartment() {
    if (step.kind !== 'symptom_result' || !step.result.suggested_department) return;
    pushMsg({ from: 'user', content: <span>Đồng ý, đặt lịch tại khoa này</span> });
    pushMsg({
      from: 'bot',
      content: <p>Bạn muốn khám vào ngày nào? Vui lòng chọn bên dưới.</p>,
    });
    setStep({ kind: 'pick_date', department: step.result.suggested_department });
  }

  async function pickDate(date: string) {
    if (step.kind !== 'pick_date') return;
    pushMsg({
      from: 'user',
      content: <span>Tôi muốn khám ngày {new Date(date).toLocaleDateString('vi-VN')}</span>,
    });
    setLoading(true);
    try {
      const res = await api.get<{ data: Doctor | null }>('/chatbot/suggest-doctor', {
        params: { department_id: step.department.id, appointment_date: date },
      });
      if (!res.data.data) {
        pushMsg({
          from: 'bot',
          content: (
            <span className="text-amber-700">
              Rất tiếc, không còn bác sĩ nào rảnh tại khoa này trong ngày bạn chọn. Bạn vui lòng
              chọn ngày khác.
            </span>
          ),
        });
        return;
      }
      const doc = res.data.data;
      pushMsg({
        from: 'bot',
        content: (
          <div>
            <p>
              Hệ thống đã chọn bác sĩ <strong className="text-brand-700">{doc.full_name}</strong>{' '}
              cho lịch khám của bạn.
            </p>
            <p className="mt-2 text-sm">Bấm xác nhận để hoàn tất đặt lịch.</p>
          </div>
        ),
      });
      setStep({
        kind: 'doctor_suggested',
        department: step.department,
        date,
        doctor: doc,
      });
    } catch (err) {
      pushMsg({ from: 'bot', content: <span className="text-red-600">{apiErrorMessage(err)}</span> });
    } finally {
      setLoading(false);
    }
  }

  async function confirmAppointment() {
    if (step.kind !== 'doctor_suggested') return;
    setLoading(true);
    try {
      const res = await api.post<{ appointment: { id: string } }>('/appointments', {
        department_id: step.department.id,
        doctor_id: step.doctor.id,
        appointment_date: step.date,
      });
      pushMsg({
        from: 'bot',
        content: (
          <div className="text-green-700">
            <Icon.Check className="inline-block mr-1" size={16} />
            Đặt lịch thành công! Bạn có thể xem chi tiết tại mục "Lịch hẹn".
          </div>
        ),
      });
      setStep({ kind: 'confirmed', appointmentId: res.data.appointment.id });
    } catch (err) {
      pushMsg({ from: 'bot', content: <span className="text-red-600">{apiErrorMessage(err)}</span> });
    } finally {
      setLoading(false);
    }
  }

  function cancelFlow() {
    pushMsg({ from: 'user', content: <span>Hủy đặt lịch</span> });
    pushMsg({
      from: 'bot',
      content: <p>Đã hủy. Bạn có thể quay lại mô tả triệu chứng bất cứ lúc nào.</p>,
    });
    setStep({ kind: 'idle' });
  }

  // Generate next 14 available dates from today.
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-7rem)] flex flex-col">
      <div className="card flex flex-col flex-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Trợ lý đặt lịch</h1>
            <p className="text-xs text-slate-500">
              Chatbot hỗ trợ phân loại khoa khám & tra cứu thư viện y tế.
            </p>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 text-xs rounded-md ${
                mode === 'symptoms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
              onClick={() => setMode('symptoms')}
            >
              Triệu chứng
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-md ${
                mode === 'library' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
              onClick={() => setMode('library')}
            >
              Tra cứu
            </button>
          </div>
        </div>

        {mode === 'library' && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <label className="text-xs text-slate-500">Chủ đề tra cứu</label>
            <div className="mt-1 flex gap-2 flex-wrap">
              {(['disease', 'medicine', 'procedure', 'test_type'] as const).map((t) => (
                <button
                  key={t}
                  className={`px-3 py-1 text-xs rounded-full border ${
                    libTopic === t
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  onClick={() => setLibTopic(t)}
                >
                  {LIB_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.from === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Inline actions theo step */}
          {step.kind === 'symptom_result' && step.result.suggested_department && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <button className="btn-primary" onClick={confirmDepartment}>
                  <Icon.Check size={16} /> Đồng ý đặt lịch
                </button>
                <button className="btn-secondary" onClick={cancelFlow}>
                  Hủy
                </button>
              </div>
            </div>
          )}

          {step.kind === 'pick_date' && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-xs text-slate-500 mb-2">Chọn ngày bạn rảnh:</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {dateOptions.map((d) => {
                  const dd = new Date(d);
                  return (
                    <button
                      key={d}
                      onClick={() => pickDate(d)}
                      disabled={loading}
                      className="text-center px-2 py-2 rounded-lg border border-slate-200 bg-white hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50"
                    >
                      <div className="text-[10px] text-slate-500 uppercase">
                        {dd.toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </div>
                      <div className="text-sm font-semibold">{dd.getDate()}/{dd.getMonth() + 1}</div>
                    </button>
                  );
                })}
              </div>
              <button className="mt-3 text-xs text-slate-500 hover:text-red-600" onClick={cancelFlow}>
                Hủy đặt lịch
              </button>
            </div>
          )}

          {step.kind === 'doctor_suggested' && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <button className="btn-primary" onClick={confirmAppointment} disabled={loading}>
                  <Icon.Check size={16} /> Xác nhận đặt lịch
                </button>
                <button className="btn-secondary" onClick={cancelFlow}>
                  Hủy
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-500">
                Đang xử lý...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-slate-100 bg-white flex gap-2"
        >
          <input
            type="text"
            className="input"
            placeholder={
              mode === 'symptoms'
                ? 'Mô tả triệu chứng của bạn...'
                : `Tìm ${LIB_LABEL[libTopic]}...`
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
            <Icon.Send size={16} />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
}
