import { supabase } from "@/lib/supabase";

export type BackupData = {
  version: number;
  timestamp: string;
  qr_codes: any[];
  qr_scans: any[];
};

export const exportBackup = async (userId: string): Promise<BackupData> => {
  // Fetch qr_codes
  const { data: qrCodes, error: qrError } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("user_id", userId);

  if (qrError) throw new Error(`Erro ao buscar códigos: ${qrError.message}`);

  const qrCodeIds = qrCodes?.map((qr) => qr.id) || [];

  // Fetch qr_scans
  let qrScans: any[] = [];
  if (qrCodeIds.length > 0) {
    const { data: scans, error: scansError } = await supabase
      .from("qr_scans")
      .select("*")
      .in("qr_code_id", qrCodeIds);

    if (scansError) throw new Error(`Erro ao buscar acessos: ${scansError.message}`);
    qrScans = scans || [];
  }

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    qr_codes: qrCodes || [],
    qr_scans: qrScans,
  };
};

export const importBackup = async (userId: string, backupData: BackupData): Promise<void> => {
  if (!backupData || !backupData.qr_codes || !Array.isArray(backupData.qr_codes)) {
    throw new Error("Formato de arquivo de backup inválido.");
  }

  const { qr_codes, qr_scans } = backupData;

  // Map old IDs to new IDs
  const idMapping: Record<string, string> = {};

  for (const oldQr of qr_codes) {
    const oldId = oldQr.id;
    let newSlug = oldQr.slug;
    let insertedQr = null;
    let attempts = 0;

    while (!insertedQr && attempts < 3) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, ...qrData } = oldQr;
      const newQr = {
        ...qrData,
        user_id: userId,
        slug: newSlug
      };

      const { data, error } = await supabase
        .from("qr_codes")
        .insert(newQr)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          newSlug = `${oldQr.slug}-${Math.random().toString(36).substring(2, 6)}`;
          attempts++;
        } else {
          console.error("Erro ao inserir código:", error);
          break;
        }
      } else {
        insertedQr = data;
      }
    }

    if (!insertedQr) continue;

    idMapping[oldId] = insertedQr.id;
  }

  // Insert scans
  if (qr_scans && Array.isArray(qr_scans) && qr_scans.length > 0) {
    const newScans = qr_scans
      .filter((scan) => idMapping[scan.qr_code_id]) // Only include scans for successfully imported QR codes
      .map((scan) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...scanData } = scan;
        return {
          ...scanData,
          qr_code_id: idMapping[scan.qr_code_id],
        };
      });

    // Insert in batches if there are many
    if (newScans.length > 0) {
      // Supabase supports bulk insert up to a certain limit, usually safe for a few thousand
      const chunkSize = 500;
      for (let i = 0; i < newScans.length; i += chunkSize) {
        const chunk = newScans.slice(i, i + chunkSize);
        const { error: scansInsertError } = await supabase
          .from("qr_scans")
          .insert(chunk);

        if (scansInsertError) {
          console.error("Erro ao inserir acessos:", scansInsertError);
        }
      }
    }
  }
};
