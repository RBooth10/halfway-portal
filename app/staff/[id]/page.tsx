"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Upload,
  UserCog,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { getSupabaseClient } from "@/lib/supabase";

type StaffRow = {
  id: string;
  provider_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  house_access: string;
  status: string;
  custom_permissions?: string[] | null;
  created_at?: string | null;
};

type EmployeeFileRow = {
  id: string;
  provider_id: string;
  staff_profile_id: string | null;
  document_name: string;
  category: string;
  compliance_domain: string | null;
  status: string;
  file_url: string | null;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not entered";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not entered";

  return date.toLocaleDateString();
}

function staffDisplayName(staff: StaffRow | null) {
  if (!staff) return "Staff Profile";

  const name = [staff.first_name, staff.last_name].filter(Boolean).join(" ");
  return name || staff.email;
}

const employeeFileTypes = [
  "Application / Employment File",
  "Background Screening",
  "Training Certificate",
  "Credential / License",
  "Ethics / Standards Acknowledgment",
  "Job Description",
  "Staff Evaluation",
  "Other Employee File",
];

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const staffId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [employeeFiles, setEmployeeFiles] = useState<EmployeeFileRow[]>([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState(employeeFileTypes[0]);
  const [fileStatus, setFileStatus] = useState("uploaded");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFile, setSavingFile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!staffId) return;

    let isMounted = true;
    const supabase = getSupabaseClient() as any;

    supabase
      .from("staff_profiles")
      .select("*")
      .eq("id", staffId)
      .single()
      .then(async (staffResult: any) => {
        if (staffResult.error) {
          throw staffResult.error;
        }

        const staffData = staffResult.data as StaffRow;

        const filesResult = await supabase
          .from("documents")
          .select("*")
          .eq("staff_profile_id", staffId)
          .order("created_at", { ascending: false });

        if (filesResult.error) {
          throw filesResult.error;
        }

        if (!isMounted) return;

        setStaff(staffData);
        setEmployeeFiles((filesResult.data ?? []) as EmployeeFileRow[]);
      })
      .catch((err: { message?: unknown }) => {
        if (!isMounted) return;

        setError(err?.message ? String(err.message) : "Could not load staff profile.");
      })
      .finally(() => {
        if (!isMounted) return;

        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [staffId]);

  function resetFileForm() {
    setFileName("");
    setFileType(employeeFileTypes[0]);
    setFileStatus("uploaded");
    setSelectedFile(null);
  }

  async function openStoredFile(filePath: string | null) {
    if (!filePath) return;

    try {
      const supabase = getSupabaseClient() as any;

      const { data, error: storageError } = await supabase.storage
        .from("compliance-documents")
        .createSignedUrl(filePath, 60 * 5);

      if (storageError) {
        throw storageError;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      const fileError = err as { message?: unknown };
      setError(fileError?.message ? String(fileError.message) : "Could not open employee file.");
    }
  }

  async function saveEmployeeFile() {
    if (!staff) {
      setError("Staff profile is not loaded yet.");
      return;
    }

    if (!fileName.trim()) {
      setError("Employee file name is required.");
      return;
    }

    setSavingFile(true);
    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseClient() as any;
      let filePath: string | null = null;

      if (selectedFile) {
        const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        filePath = `${staff.provider_id}/staff/${staff.id}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("compliance-documents")
          .upload(filePath, selectedFile, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }
      }

      const { data, error: insertError } = await supabase
        .from("documents")
        .insert({
          provider_id: staff.provider_id,
          staff_profile_id: staff.id,
          document_name: fileName.trim(),
          category: "Staff",
          compliance_domain: fileType,
          status: selectedFile ? fileStatus : "needs_review",
          file_url: filePath,
        })
        .select("*")
        .single();

      if (insertError) {
        throw insertError;
      }

      setEmployeeFiles((current) => [data as EmployeeFileRow, ...current]);
      resetFileForm();
      setShowFileModal(false);
      setMessage("Employee file saved.");
    } catch (err) {
      const saveError = err as { message?: unknown };
      setError(saveError?.message ? String(saveError.message) : "Could not save employee file.");
    } finally {
      setSavingFile(false);
    }
  }

  return (
    <PageShell>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff
        </Link>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading staff profile...
          </div>
        </div>
      ) : null}

      {staff ? (
        <>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                  <UserCog className="h-6 w-6 text-slate-700" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Staff Profile</p>
                  <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">
                    {staffDisplayName(staff)}
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">{staff.email}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Role: {staff.role.replaceAll("_", " ")}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Access: {staff.house_access.replaceAll("_", " ")}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Phone: {staff.phone || "Not entered"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Files: {employeeFiles.length}
                    </span>
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {staff.status}
              </span>
            </div>

            {staff.role === "custom" ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Custom Permissions</p>
                {staff.custom_permissions && staff.custom_permissions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {staff.custom_permissions.map((permission) => (
                      <span key={permission} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {permission}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No custom permissions selected.</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Employee Files</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Applications, screenings, credentials, trainings, and evaluations.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFileModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Employee File
              </button>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {employeeFiles.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  No employee files saved yet.
                </p>
              ) : (
                employeeFiles.map((file) => (
                  <div key={file.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium text-slate-950">{file.document_name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {file.compliance_domain || file.category} • {file.status} • {formatDate(file.created_at)}
                        </p>
                      </div>

                      {file.file_url ? (
                        <button
                          type="button"
                          onClick={() => void openStoredFile(file.file_url)}
                          className="rounded-xl border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Open File
                        </button>
                      ) : (
                        <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                          No file uploaded
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      {showFileModal && staff ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Add Employee File</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload or track an employee file for {staffDisplayName(staff)}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetFileForm();
                  setShowFileModal(false);
                }}
                className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">File name</span>
                <input
                  type="text"
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="Example: Level II Background Screening"
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">File type</span>
                <select
                  value={fileType}
                  onChange={(event) => setFileType(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  {employeeFileTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={fileStatus}
                  onChange={(event) => setFileStatus(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none ring-slate-900/10 focus:ring-4"
                >
                  <option value="uploaded">Uploaded</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="expired">Expired</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Upload file</span>
                <div className="mt-2 rounded-2xl border bg-slate-50 p-4">
                  <input
                    type="file"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Files are stored in the private compliance-documents bucket.
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={saveEmployeeFile}
                disabled={savingFile}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {savingFile ? "Saving..." : "Save Employee File"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
