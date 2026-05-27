import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { formatDate } from '../../lib/format';

interface PatientProfile {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_type: string | null;
  address: string;
  phone: string;
  insurance_number: string | null;
  insurance_expiry: string | null;
  priority_type: number | null;
}

const PRIORITY: Record<number, string> = {
  1: 'Trẻ em dưới 6 tuổi',
  2: 'Người khuyết tật',
  3: 'Người trên 80 tuổi',
  4: 'Người có công với cách mạng',
  5: 'Phụ nữ có thai',
};

const GENDER: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ patient?: PatientProfile; data?: PatientProfile } & PatientProfile>('/patients/me')
      .then((res) => {
        const d =
          (res.data as { patient?: PatientProfile; data?: PatientProfile }).patient ??
          (res.data as { data?: PatientProfile }).data ??
          (res.data as PatientProfile);
        setProfile(d);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const insuranceExpired =
    profile?.insurance_expiry && new Date(profile.insurance_expiry) < new Date();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Thông tin cá nhân</h1>
        <p className="text-sm text-slate-500">
          Mọi thay đổi thông tin cần được thực hiện tại quầy tiếp tân.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6 animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      ) : profile ? (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold">
                {profile.full_name?.[0]?.toUpperCase() ?? 'P'}
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{profile.full_name}</div>
                <div className="text-sm text-slate-500">
                  {GENDER[profile.gender]} · {formatDate(profile.date_of_birth)}
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="Nhóm máu" value={profile.blood_type} />
              <Field label="Số điện thoại" value={profile.phone} />
              <Field
                label="Đối tượng ưu tiên"
                value={profile.priority_type ? PRIORITY[profile.priority_type] : 'Không có'}
              />
              <Field label="Địa chỉ thường trú" value={profile.address} />
            </dl>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-slate-900">Bảo hiểm y tế</h3>
              {insuranceExpired && (
                <span className="badge bg-red-100 text-red-700">Đã hết hạn</span>
              )}
            </div>
            {profile.insurance_number ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Số BHYT" value={profile.insurance_number} />
                <Field label="Ngày hết hạn" value={formatDate(profile.insurance_expiry)} />
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Chưa đăng ký BHYT</p>
            )}
            {insuranceExpired && (
              <div className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">
                Vui lòng mang thẻ BHYT đến tiếp tân để cập nhật ngày hết hạn mới.
              </div>
            )}
          </div>

          <div className="card p-6 bg-slate-50">
            <div className="flex items-start gap-3">
              <Icon.AlertCircle className="text-slate-400 mt-0.5" />
              <div className="text-sm text-slate-600">
                Bạn không thể tự sửa thông tin cá nhân. Mọi điều chỉnh (số điện thoại, địa chỉ,
                BHYT...) vui lòng liên hệ quầy tiếp tân và mang theo giấy tờ tùy thân.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500 mb-1">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}
