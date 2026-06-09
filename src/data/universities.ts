const UNIVERSITY_DOMAINS: Record<string, { name: string; shortName: string; city: string }> = {
  // Hà Nội
  "st.ftu.edu.vn": { name: "Đại học Ngoại Thương", shortName: "FTU", city: "Hà Nội" },
  "ftu.edu.vn": { name: "Đại học Ngoại Thương", shortName: "FTU", city: "Hà Nội" },
  "neu.edu.vn": { name: "Đại học Kinh tế Quốc dân", shortName: "NEU", city: "Hà Nội" },
  "hust.edu.vn": { name: "Đại học Bách Khoa Hà Nội", shortName: "HUST", city: "Hà Nội" },
  "vnu.edu.vn": { name: "Đại học Quốc gia Hà Nội", shortName: "VNU", city: "Hà Nội" },
  "ulis.vnu.edu.vn": { name: "Đại học Ngoại ngữ - VNU", shortName: "ULIS", city: "Hà Nội" },
  "ou.edu.vn": { name: "Đại học Mở Hà Nội", shortName: "HOU", city: "Hà Nội" },
  "hnue.edu.vn": { name: "Đại học Sư phạm Hà Nội", shortName: "HNUE", city: "Hà Nội" },
  "ptit.edu.vn": { name: "Học viện Bưu chính Viễn thông", shortName: "PTIT", city: "Hà Nội" },
  "dav.edu.vn": { name: "Học viện Ngoại giao", shortName: "DAV", city: "Hà Nội" },
  "ajc.edu.vn": { name: "Học viện Báo chí và Tuyên truyền", shortName: "AJC", city: "Hà Nội" },
  "hmu.edu.vn": { name: "Đại học Y Hà Nội", shortName: "HMU", city: "Hà Nội" },
  "nuce.edu.vn": { name: "Đại học Xây dựng Hà Nội", shortName: "NUCE", city: "Hà Nội" },
  "hpu2.edu.vn": { name: "Đại học Sư phạm Hà Nội 2", shortName: "HPU2", city: "Hà Nội" },
  // TP.HCM
  "hcmus.edu.vn": { name: "Đại học Khoa học Tự nhiên HCM", shortName: "HCMUS", city: "TP.HCM" },
  "hcmut.edu.vn": { name: "Đại học Bách Khoa HCM", shortName: "HCMUT", city: "TP.HCM" },
  "ueh.edu.vn": { name: "Đại học Kinh tế TP.HCM", shortName: "UEH", city: "TP.HCM" },
  "hcmulaw.edu.vn": { name: "Đại học Luật TP.HCM", shortName: "HCMULAW", city: "TP.HCM" },
  "hcmue.edu.vn": { name: "Đại học Sư phạm TP.HCM", shortName: "HCMUE", city: "TP.HCM" },
  "hutech.edu.vn": { name: "Đại học Công nghệ TP.HCM", shortName: "HUTECH", city: "TP.HCM" },
  "uit.edu.vn": { name: "Đại học CNTT - VNU HCM", shortName: "UIT", city: "TP.HCM" },
  "ufm.edu.vn": { name: "Đại học Tài chính - Marketing", shortName: "UFM", city: "TP.HCM" },
  // Đà Nẵng
  "due.udn.vn": { name: "Đại học Kinh tế Đà Nẵng", shortName: "DUE", city: "Đà Nẵng" },
  "dut.udn.vn": { name: "Đại học Bách Khoa Đà Nẵng", shortName: "DUT", city: "Đà Nẵng" },
  "udn.vn": { name: "Đại học Đà Nẵng", shortName: "UD", city: "Đà Nẵng" },
  // Các tỉnh khác
  "ctu.edu.vn": { name: "Đại học Cần Thơ", shortName: "CTU", city: "Cần Thơ" },
  "hueuni.edu.vn": { name: "Đại học Huế", shortName: "HUE", city: "Huế" },
  "vhu.edu.vn": { name: "Đại học Văn Hiến", shortName: "VHU", city: "TP.HCM" },
};

export default UNIVERSITY_DOMAINS;

// Hàm detect trường từ email
export function detectUniversityFromEmail(email: string) {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length < 2) return null;
  const domain = parts[1].toLowerCase().trim();
  if (!domain) return null;
  
  // Thử exact match trước
  if (UNIVERSITY_DOMAINS[domain]) {
    return { domain, ...UNIVERSITY_DOMAINS[domain] };
  }
  
  // Check nếu domain kết thúc bằng một university domain
  // Sắp xếp các domains từ dài đến ngắn để tránh matching sai (ví dụ ulis.vnu.edu.vn vs vnu.edu.vn)
  const sortedDomains = Object.keys(UNIVERSITY_DOMAINS).sort((a, b) => b.length - a.length);
  for (const uniDomain of sortedDomains) {
    if (domain.endsWith('.' + uniDomain) || domain === uniDomain) {
      return { domain: uniDomain, ...UNIVERSITY_DOMAINS[uniDomain] };
    }
  }
  return null;
}
