# -*- coding: utf-8 -*-
"""
Cơ sở dữ liệu 200 bệnh phổ biến — nguồn để generate:
  - diseases.csv (training data cho Random Forest)
  - disease_explanations.txt (giải thích bệnh)
  - treatment_guide.txt (hướng dẫn điều trị)

Mỗi bệnh có 8-12 triệu chứng (rút từ vocab 300 trong symptoms_data.py).
Khi generate CSV, mỗi bệnh sinh ≥10 dòng = nhiều subset triệu chứng khác nhau.

Severity: "nhẹ" | "trung bình" | "nặng" | "nguy hiểm"
"""

# (name, department, severity, [symptoms], explanation, treatment)
DISEASES = [
    # ════════════════ NỘI KHOA — Truyền nhiễm thông thường (13) ════════════════
    ("Cảm cúm", "Nội khoa", "nhẹ",
     ["sốt cao", "đau đầu", "mệt mỏi", "sổ mũi", "đau họng", "ho khan", "đau cơ", "ớn lạnh", "hắt hơi", "nghẹt mũi"],
     "Nhiễm virus cúm Influenza cấp tính đường hô hấp trên, lây qua giọt bắn, thường gặp mùa lạnh.",
     "Nghỉ ngơi, uống nhiều nước, ăn cháo nóng. Paracetamol 500mg khi sốt >38.5°C, mỗi 4-6h. Vaccine cúm hàng năm để phòng ngừa."),

    ("Cảm lạnh thường", "Nội khoa", "nhẹ",
     ["sổ mũi", "hắt hơi", "đau họng", "ho khan", "nghẹt mũi", "đau đầu", "mệt mỏi", "rát họng"],
     "Nhiễm Rhinovirus đường hô hấp trên, tự khỏi sau 7-10 ngày, ít biến chứng.",
     "Súc miệng nước muối ấm, xông hơi tinh dầu. Uống nước ấm, vitamin C. Không cần kháng sinh trừ khi có bội nhiễm."),

    ("Sốt phát ban", "Nội khoa", "nhẹ",
     ["sốt cao", "phát ban", "mệt mỏi", "đau đầu", "hạch to", "đau cơ", "đau họng", "biếng ăn"],
     "Bệnh nhiễm virus (Roseola, Rubella, Coxsackie...) gây sốt rồi nổi ban toàn thân.",
     "Hạ sốt paracetamol, nghỉ ngơi, uống nước. Ban tự lặn sau 3-5 ngày. Cách ly để tránh lây."),

    ("Quai bị", "Nội khoa", "trung bình",
     ["sốt cao", "sưng hạch cổ", "đau hàm", "khó nuốt", "đau đầu", "đau cơ", "mệt mỏi", "chán ăn"],
     "Nhiễm virus Mumps gây viêm tuyến nước bọt mang tai, biến chứng viêm tinh hoàn, viêm tụy.",
     "Nghỉ ngơi 7-10 ngày, ăn lỏng, chườm mát vùng sưng. Theo dõi biến chứng viêm tinh hoàn ở nam tuổi dậy thì."),

    ("Sởi", "Nội khoa", "trung bình",
     ["sốt cao", "phát ban", "ho khan", "đỏ mắt", "chảy nước mắt", "sổ mũi", "mệt mỏi", "đau họng"],
     "Nhiễm virus Sởi (Measles), rất lây, ban đỏ lan từ mặt xuống thân. Có thể biến chứng viêm phổi, viêm não.",
     "Cách ly, nghỉ ngơi, uống nhiều nước. Vitamin A liều cao. Tiêm vaccine MMR là biện pháp phòng ngừa chủ yếu."),

    ("Thủy đậu", "Nội khoa", "trung bình",
     ["sốt nhẹ", "phát ban", "mụn nước", "ngứa da", "mệt mỏi", "đau đầu", "biếng ăn", "đau cơ"],
     "Nhiễm virus Varicella-Zoster, mụn nước rải rác toàn thân nhiều giai đoạn cùng lúc.",
     "Cách ly đến khi mụn đóng vảy. Bôi calamine, không gãi. Uống Acyclovir nếu nặng. Vaccine VZV phòng ngừa."),

    ("Rubella", "Nội khoa", "nhẹ",
     ["sốt nhẹ", "phát ban", "hạch to", "sưng hạch cổ", "đau khớp", "đau đầu", "mệt mỏi"],
     "Nhiễm virus Rubella, ban hồng kéo dài 3 ngày. Nguy hiểm cho phụ nữ mang thai (gây dị tật thai).",
     "Nghỉ ngơi, hạ sốt. Phụ nữ tuổi sinh đẻ cần tiêm vaccine MMR trước khi mang thai 3 tháng."),

    ("Sốt rét", "Nội khoa", "nặng",
     ["sốt từng cơn", "rét run", "vã mồ hôi", "đau đầu", "mệt mỏi", "buồn nôn", "đau cơ", "thiếu máu"],
     "Nhiễm ký sinh trùng Plasmodium qua muỗi Anopheles. Sốt chu kỳ 24-72h tùy loại.",
     "Điều trị bằng Artemisinin phối hợp (ACT) tại bệnh viện. Tầm soát ký sinh trùng máu. Phòng muỗi đốt."),

    ("Sốt xuất huyết Dengue", "Nội khoa", "nặng",
     ["sốt cao", "đau đầu dữ dội", "đau sau hốc mắt", "đau cơ", "đau khớp", "phát ban", "xuất huyết da", "chảy máu mũi"],
     "Nhiễm virus Dengue qua muỗi Aedes. Biến chứng sốc, xuất huyết ngày 4-7 của bệnh.",
     "Bù dịch điện giải, theo dõi tiểu cầu, hematocrit. Không dùng Aspirin, Ibuprofen. Nhập viện khi sốc, xuất huyết nặng."),

    ("Thương hàn", "Nội khoa", "nặng",
     ["sốt cao", "đau đầu", "đau bụng", "tiêu chảy", "táo bón", "mệt mỏi", "chán ăn", "phát ban"],
     "Nhiễm khuẩn Salmonella Typhi qua đường ăn uống. Sốt tăng dần hình bậc thang.",
     "Kháng sinh Ciprofloxacin hoặc Ceftriaxone 10-14 ngày. Bù dịch, vệ sinh ăn uống. Vaccine phòng ngừa."),

    ("COVID-19", "Nội khoa", "trung bình",
     ["sốt cao", "ho khan", "khó thở", "mệt mỏi", "đau cơ", "mất mùi", "mất vị giác", "đau họng"],
     "Nhiễm virus SARS-CoV-2, lây qua giọt bắn. Biến chứng viêm phổi, đông máu, hậu COVID.",
     "Cách ly, theo dõi SpO2 và nhịp thở. Paracetamol hạ sốt. Nhập viện khi SpO2 <94%. Tiêm vaccine định kỳ."),

    ("Cúm A H1N1", "Nội khoa", "trung bình",
     ["sốt cao", "ho khan", "đau cơ", "đau đầu", "mệt mỏi", "sổ mũi", "đau họng", "ớn lạnh"],
     "Cúm gia cầm/lợn biến đổi gen, có thể gây dịch lớn. Biến chứng viêm phổi nặng.",
     "Tamiflu (Oseltamivir) 75mg x2/ngày trong 5 ngày. Cách ly, đeo khẩu trang. Vaccine cúm mùa hàng năm."),

    ("Viêm gan A cấp", "Nội khoa", "trung bình",
     ["vàng da", "vàng mắt", "mệt mỏi", "chán ăn", "buồn nôn", "đau hạ sườn phải", "sốt nhẹ", "nước tiểu sẫm"],
     "Nhiễm virus HAV qua đường ăn uống, tự khỏi không mạn tính. Vệ sinh thực phẩm kém là yếu tố nguy cơ.",
     "Nghỉ ngơi, ăn nhẹ, kiêng rượu bia. Theo dõi chức năng gan. Vaccine HAV phòng ngừa."),

    # ════════════════ TIM MẠCH (15) ═══════════════════════════════════════════
    ("Tăng huyết áp", "Tim mạch", "trung bình",
     ["đau đầu", "đau gáy", "chóng mặt", "hồi hộp", "mờ mắt", "ù tai", "đỏ mặt từng cơn", "đau ngực"],
     "Huyết áp ≥140/90 mmHg kéo dài. Nguyên nhân di truyền, lối sống, bệnh thận. Biến chứng đột quỵ, tim mạch.",
     "Giảm muối, tập thể dục, giảm cân. Thuốc: Amlodipine, Losartan, Bisoprolol. Theo dõi HA tại nhà mỗi ngày."),

    ("Hạ huyết áp", "Tim mạch", "nhẹ",
     ["chóng mặt", "hoa mắt", "mệt mỏi", "da xanh tái", "ngất xỉu", "buồn nôn", "tim đập nhanh", "đau đầu"],
     "HA <90/60 mmHg, có thể do thiếu nước, thiếu máu, rối loạn nội tiết, thuốc.",
     "Uống đủ nước, ăn đủ muối. Đứng dậy từ từ. Tìm và điều trị nguyên nhân (thiếu máu, suy thượng thận)."),

    ("Nhồi máu cơ tim", "Tim mạch", "nguy hiểm",
     ["đau ngực bóp nghẹt", "đau lan vai trái", "đau lan hàm", "đau lan tay trái", "khó thở", "vã mồ hôi", "buồn nôn", "tím tái"],
     "Tắc động mạch vành cấp do huyết khối trên mảng xơ vữa, hoại tử cơ tim. Cấp cứu trong 'giờ vàng' 90 phút.",
     "GỌI CẤP CỨU NGAY. Aspirin 300mg nhai. Tái thông mạch (PCI hoặc tiêu sợi huyết). Sau đó dùng thuốc lâu dài, phục hồi tim mạch."),

    ("Suy tim", "Tim mạch", "nặng",
     ["khó thở khi nằm", "khó thở gắng sức", "phù chân", "mệt mỏi", "ho khan", "tim đập nhanh", "khó thở đêm", "tăng cân"],
     "Tim không bơm đủ máu cung cấp cho cơ thể. Nguyên nhân THA, bệnh van tim, sau nhồi máu.",
     "Hạn chế muối <2g/ngày, hạn chế nước. Thuốc: ACEi, Beta-blocker, lợi tiểu. Theo dõi cân nặng hàng ngày."),

    ("Rối loạn nhịp tim", "Tim mạch", "trung bình",
     ["hồi hộp", "tim đập nhanh", "nhịp tim loạn", "chóng mặt", "khó thở", "đánh trống ngực", "ngất xỉu", "mệt mỏi"],
     "Rối loạn dẫn truyền điện tim: rung nhĩ, ngoại tâm thu, nhịp nhanh trên thất, block AV.",
     "Holter 24h, ECG. Thuốc chống loạn nhịp (Beta-blocker, Amiodarone). Đốt điện cao tần (RFA) nếu cần."),

    ("Hẹp van hai lá", "Tim mạch", "nặng",
     ["khó thở gắng sức", "ho ra máu", "hồi hộp", "phù chân", "mệt mỏi", "đau ngực", "ho khan", "tim đập nhanh"],
     "Van hai lá hẹp, máu khó từ nhĩ trái xuống thất trái, ứ máu phổi. Hay gặp sau thấp tim.",
     "Lợi tiểu, hạn chế muối. Kháng đông nếu có rung nhĩ. Nong van bằng bóng hoặc thay van khi nặng."),

    ("Hở van hai lá", "Tim mạch", "trung bình",
     ["khó thở", "mệt mỏi", "hồi hộp", "phù chân", "tim đập nhanh", "đau ngực", "ho khan", "khó thở khi nằm"],
     "Van hai lá đóng không kín, máu trào ngược về nhĩ trái khi tâm thu.",
     "Theo dõi siêu âm tim định kỳ. ACEi giảm hậu gánh. Phẫu thuật sửa/thay van khi triệu chứng nặng."),

    ("Bệnh mạch vành", "Tim mạch", "nặng",
     ["đau ngực khi gắng sức", "đau lan vai trái", "khó thở", "mệt mỏi", "hồi hộp", "tức ngực", "vã mồ hôi", "buồn nôn"],
     "Xơ vữa động mạch vành làm hẹp lòng mạch, thiếu máu cơ tim. Yếu tố: hút thuốc, mỡ máu, đái tháo đường.",
     "Aspirin, Statin, Beta-blocker. Nitroglycerin khi đau. Tái thông bằng stent (PCI) hoặc bắc cầu mạch vành (CABG)."),

    ("Đau thắt ngực ổn định", "Tim mạch", "trung bình",
     ["đau ngực khi gắng sức", "đau lan vai trái", "khó thở", "tức ngực", "đau lan hàm", "vã mồ hôi", "hồi hộp"],
     "Đau ngực có thể tiên đoán được, xuất hiện khi gắng sức, giảm khi nghỉ. Do hẹp mạch vành.",
     "Nitroglycerin ngậm dưới lưỡi khi đau. Aspirin, Statin, Beta-blocker. Nghiệm pháp gắng sức, chụp mạch vành."),

    ("Viêm cơ tim", "Tim mạch", "nặng",
     ["đau ngực", "khó thở", "mệt mỏi", "sốt nhẹ", "hồi hộp", "nhịp tim loạn", "phù chân", "ngất xỉu"],
     "Viêm cơ tim do virus (Coxsackie, COVID), thuốc, tự miễn. Có thể tiến triển suy tim cấp.",
     "Nhập viện theo dõi nhịp tim. Hạn chế gắng sức. Thuốc tim mạch tùy biểu hiện. Tránh NSAID."),

    ("Viêm màng ngoài tim", "Tim mạch", "trung bình",
     ["đau ngực", "khó thở", "sốt nhẹ", "ho khan", "đau ngực khi gắng sức", "đánh trống ngực", "mệt mỏi"],
     "Viêm màng bao quanh tim, đau ngực tăng khi hít sâu, giảm khi cúi người về phía trước.",
     "NSAID (Ibuprofen) liều cao + Colchicine 3 tháng. Corticoid khi tái phát. Chọc dịch màng tim nếu tràn dịch nhiều."),

    ("Phình động mạch chủ bụng", "Tim mạch", "nguy hiểm",
     ["đau bụng", "đau lưng dưới", "khối u sờ thấy", "đau lan vai trái", "tụt huyết áp", "vã mồ hôi", "ngất xỉu"],
     "Phình giãn động mạch chủ bụng, vỡ phình là cấp cứu tử vong cao. Hay gặp nam giới >65t hút thuốc.",
     "Theo dõi siêu âm bụng nếu <5cm. Phẫu thuật mở hoặc đặt stent graft khi >5.5cm hoặc đau."),

    ("Suy tĩnh mạch chi dưới", "Tim mạch", "nhẹ",
     ["đau chân", "phù chân", "chuột rút", "tê chân", "nặng chân", "tiếng khớp kêu", "ngứa da"],
     "Van tĩnh mạch sâu/nông suy yếu, máu ứ chi dưới. Gặp ở người đứng lâu, phụ nữ, mang thai.",
     "Mang vớ áp lực, kê chân cao, tập thể dục. Daflon hoặc đốt laser tĩnh mạch khi nặng."),

    ("Huyết khối tĩnh mạch sâu", "Tim mạch", "nặng",
     ["đau chân", "phù chân", "đỏ da", "nóng khớp", "đau bẹn", "tê chân", "khó thở"],
     "Huyết khối trong tĩnh mạch sâu chi dưới, nguy cơ thuyên tắc phổi gây tử vong.",
     "Heparin trọng lượng phân tử thấp (Enoxaparin) chuyển sang Warfarin/Rivaroxaban 3-6 tháng. Mang vớ áp lực."),

    ("Bệnh Buerger", "Tim mạch", "nặng",
     ["đau chân", "đau khi đi", "tê chân", "đi tập tễnh", "vết loét da", "đau tay", "tê tay", "đau ngón chân"],
     "Viêm tắc động mạch chi nhỏ ở người hút thuốc trẻ tuổi (nam <45t). Có thể hoại tử ngón.",
     "BỎ THUỐC LÁ TUYỆT ĐỐI. Thuốc giãn mạch, kháng tiểu cầu. Cắt cụt khi hoại tử không phục hồi."),

    # ════════════════ TIÊU HÓA (20) ═══════════════════════════════════════════
    ("Viêm dạ dày", "Tiêu hóa", "nhẹ",
     ["đau thượng vị", "buồn nôn", "ợ chua", "ợ hơi", "đầy bụng", "nóng rát thượng vị", "chán ăn", "đau bụng sau ăn"],
     "Viêm niêm mạc dạ dày do H.pylori, NSAID, rượu, stress. Có thể cấp hoặc mạn tính.",
     "Test HP, kháng sinh nếu dương tính. PPI (Omeprazole, Esomeprazole) 4-8 tuần. Tránh rượu, NSAID."),

    ("Loét dạ dày tá tràng", "Tiêu hóa", "trung bình",
     ["đau thượng vị", "đau tăng khi đói", "đau giảm khi ăn", "ợ chua", "buồn nôn", "nôn ra máu", "phân đen", "đầy bụng"],
     "Tổn thương niêm mạc dạ dày/tá tràng, hay do H.pylori, NSAID. Biến chứng xuất huyết, thủng.",
     "Phác đồ tiệt trừ HP (PPI + 2 kháng sinh 14 ngày). PPI duy trì 4-8 tuần. Nội soi kiểm tra."),

    ("Trào ngược dạ dày thực quản", "Tiêu hóa", "nhẹ",
     ["ợ chua", "ợ hơi", "nóng rát thượng vị", "đau thượng vị", "ho khan", "khàn giọng", "khó nuốt", "buồn nôn"],
     "Acid dạ dày trào ngược lên thực quản. Yếu tố: béo phì, ăn no, nằm sau ăn, thoát vị hoành.",
     "Ăn ít, không nằm 3h sau ăn, kê đầu giường cao. Giảm cân. PPI 4-8 tuần. Tránh cà phê, rượu, đồ cay."),

    ("Viêm ruột thừa cấp", "Tiêu hóa", "nguy hiểm",
     ["đau hố chậu phải", "đau bụng", "sốt nhẹ", "buồn nôn", "nôn", "chán ăn", "đau khi đi", "đau quặn bụng"],
     "Viêm cấp ruột thừa, cần phẫu thuật cấp cứu. Vỡ ruột thừa gây viêm phúc mạc nguy hiểm.",
     "CẤP CỨU. Phẫu thuật cắt ruột thừa nội soi trong 24-48h. Kháng sinh trước và sau mổ."),

    ("Tiêu chảy cấp", "Tiêu hóa", "nhẹ",
     ["tiêu chảy nhiều lần", "đau quặn bụng", "buồn nôn", "nôn", "sốt nhẹ", "khát nước nhiều", "mệt mỏi", "chán ăn"],
     "Đi ngoài lỏng ≥3 lần/ngày <14 ngày. Nguyên nhân: virus, vi khuẩn, ngộ độc thực phẩm.",
     "Bù dịch điện giải (Oresol). Smecta hấp phụ. Loperamide nếu không sốt/máu. Kháng sinh chọn lọc khi do vi khuẩn."),

    ("Lỵ amip", "Tiêu hóa", "trung bình",
     ["tiêu chảy nhiều lần", "phân nhầy", "phân có máu", "đau quặn bụng", "mót rặn", "sốt nhẹ", "mệt mỏi"],
     "Nhiễm Entamoeba histolytica. Có thể gây áp xe gan amip. Thường do nước uống nhiễm bẩn.",
     "Metronidazole 750mg x3/ngày trong 10 ngày + Paromomycin tiệt thể nang. Bù dịch."),

    ("Lỵ trực khuẩn", "Tiêu hóa", "trung bình",
     ["tiêu chảy nhiều lần", "phân có máu", "phân nhầy", "đau quặn bụng", "sốt cao", "mót rặn", "buồn nôn", "mệt mỏi"],
     "Nhiễm khuẩn Shigella. Tiêu chảy ra máu mủ, mót rặn nhiều. Lây qua đường ăn uống.",
     "Ciprofloxacin hoặc Azithromycin 3-5 ngày. Bù dịch tích cực. Không dùng thuốc cầm tiêu chảy."),

    ("Viêm đại tràng mạn", "Tiêu hóa", "trung bình",
     ["đau bụng", "tiêu chảy", "táo bón", "phân nhầy", "đầy bụng", "chướng bụng", "mót rặn", "đau quặn bụng"],
     "Viêm mạn tính niêm mạc đại tràng, có thể do nhiễm trùng kéo dài, IBD, lao ruột.",
     "Chế độ ăn nhạt, kiêng chua cay. Mesalamine nếu IBD. Probiotic, men vi sinh. Nội soi định kỳ."),

    ("Hội chứng ruột kích thích", "Tiêu hóa", "nhẹ",
     ["đau bụng", "đau quặn bụng", "tiêu chảy", "táo bón", "đầy bụng", "chướng bụng", "phân nhầy", "mệt mỏi"],
     "Rối loạn chức năng ruột không có tổn thương thực thể. Đau bụng + thay đổi đại tiện.",
     "Chế độ ăn FODMAP thấp, tránh stress. Spasmaverine giảm co thắt. Loperamide hoặc nhuận tràng theo thể."),

    ("Táo bón mạn tính", "Tiêu hóa", "nhẹ",
     ["táo bón", "đại tiện khó", "đau bụng", "đầy bụng", "chướng bụng", "đau hậu môn", "mệt mỏi", "ngứa hậu môn"],
     "Đi ngoài <3 lần/tuần, phân cứng. Nguyên nhân: ăn ít chất xơ, ít vận động, thuốc, bệnh thần kinh.",
     "Tăng chất xơ 25-30g/ngày, uống 2L nước. Tập thói quen đại tiện. Forlax hoặc Duphalac nếu cần."),

    ("Bệnh trĩ", "Tiêu hóa", "nhẹ",
     ["phân có máu", "đau hậu môn", "ngứa hậu môn", "đại tiện khó", "đau khi đi", "mót rặn"],
     "Giãn tĩnh mạch hậu môn, có trĩ nội (chảy máu khi đi) và trĩ ngoại (đau, sa búi).",
     "Ngâm hậu môn nước ấm, tránh rặn, tăng chất xơ. Daflon, Proctolog. Phẫu thuật khi trĩ độ 3-4."),

    ("Polyp đại tràng", "Tiêu hóa", "trung bình",
     ["phân có máu", "tiêu chảy", "táo bón", "đau bụng", "mệt mỏi", "chán ăn", "sụt cân", "đầy bụng"],
     "Khối u lành tính niêm mạc đại tràng, có thể tiến triển ung thư đại tràng nếu không cắt.",
     "Nội soi cắt polyp, sinh thiết giải phẫu bệnh. Tầm soát đại tràng 5 năm/lần sau 50t."),

    ("Xơ gan", "Tiêu hóa", "nặng",
     ["vàng da", "vàng mắt", "cổ trướng", "mệt mỏi", "chán ăn", "sụt cân", "phù chân", "dễ chảy máu", "nôn ra máu"],
     "Mô gan xơ hóa do viêm gan B/C, rượu, gan nhiễm mỡ kéo dài. Biến chứng vỡ giãn TM thực quản, suy gan.",
     "Bỏ rượu tuyệt đối. Điều trị nguyên nhân (kháng virus HBV/HCV). Lợi tiểu, chế độ ăn ít muối, đạm vừa."),

    ("Viêm gan B mạn", "Tiêu hóa", "nặng",
     ["mệt mỏi", "vàng da", "đau hạ sườn phải", "chán ăn", "buồn nôn", "đầy bụng", "ngứa da", "sụt cân"],
     "Nhiễm HBV mạn >6 tháng. Có thể tiến triển xơ gan, ung thư gan. Lây qua máu, tình dục, mẹ-con.",
     "Tenofovir hoặc Entecavir lâu dài. Siêu âm + AFP 6 tháng/lần tầm soát ung thư. Vaccine cho người tiếp xúc."),

    ("Viêm gan C mạn", "Tiêu hóa", "nặng",
     ["mệt mỏi", "đau hạ sườn phải", "vàng da", "chán ăn", "buồn nôn", "đau khớp", "ngứa da"],
     "Nhiễm HCV, 80% chuyển mạn. Có thuốc DAA chữa khỏi trên 95%. Lây chủ yếu qua máu.",
     "Sofosbuvir + Daclatasvir hoặc Velpatasvir 12 tuần. Sàng lọc HCC. Tránh rượu, gan độc."),

    ("Viêm tụy cấp", "Tiêu hóa", "nguy hiểm",
     ["đau thượng vị", "đau lan vai trái", "buồn nôn", "nôn", "sốt nhẹ", "đầy bụng", "tim đập nhanh", "vã mồ hôi"],
     "Viêm tụy đột ngột, hay do sỏi mật hoặc rượu. Đau dữ dội xuyên ra sau lưng.",
     "Nhập viện, nhịn ăn, truyền dịch tích cực. Giảm đau opioid. ERCP nếu do sỏi mật. ICU nếu nặng."),

    ("Viêm túi mật cấp", "Tiêu hóa", "nặng",
     ["đau hạ sườn phải", "sốt cao", "buồn nôn", "nôn", "vàng da", "ớn lạnh", "đau lan vai phải", "đầy bụng"],
     "Viêm túi mật, 90% do sỏi kẹt cổ túi mật. Dấu Murphy dương tính. Cần phẫu thuật.",
     "Nhịn ăn, kháng sinh, giảm đau. Phẫu thuật cắt túi mật nội soi trong 72h."),

    ("Sỏi mật", "Tiêu hóa", "trung bình",
     ["đau hạ sườn phải", "buồn nôn", "nôn", "đầy bụng", "đau bụng sau ăn", "vàng da", "ợ hơi", "khó tiêu"],
     "Sỏi trong túi mật, đa số không triệu chứng. Cơn đau quặn mật khi sỏi kẹt cổ túi mật.",
     "Theo dõi nếu không triệu chứng. Cắt túi mật nội soi nếu đau tái phát, biến chứng."),

    ("Tắc ruột", "Tiêu hóa", "nguy hiểm",
     ["đau quặn bụng", "nôn", "chướng bụng", "táo bón", "không đi ngoài", "đầy bụng", "tim đập nhanh", "mệt mỏi"],
     "Tắc nghẽn lưu thông ruột do dính sau mổ, u, thoát vị, lồng ruột. Cấp cứu ngoại khoa.",
     "Nhịn ăn, đặt sonde dạ dày dẫn lưu, truyền dịch. Phẫu thuật giải tắc nếu không tự thông."),

    ("Thoát vị bẹn", "Tiêu hóa", "trung bình",
     ["khối u sờ thấy", "đau bẹn", "đau khi đi", "đau bụng", "buồn nôn", "đau quặn bụng"],
     "Tạng trong ổ bụng (ruột) thoát qua ống bẹn. Có khối u lồi vùng bẹn khi rặn, đứng lâu.",
     "Phẫu thuật đặt lưới prolene (Lichtenstein) khi có triệu chứng. Cấp cứu nếu nghẹt."),

    # ════════════════ HÔ HẤP (15) ════════════════════════════════════════════
    ("Viêm phổi cộng đồng", "Hô hấp", "nặng",
     ["sốt cao", "ho có đờm", "khó thở", "đau ngực", "mệt mỏi", "ớn lạnh", "vã mồ hôi", "tím tái"],
     "Nhiễm khuẩn nhu mô phổi mắc tại cộng đồng. Hay do Streptococcus pneumoniae, Mycoplasma.",
     "Kháng sinh theo phác đồ (Amoxicillin/Azithromycin OPD; Ceftriaxone IPD). X-quang ngực kiểm tra. Vaccine phế cầu."),

    ("Viêm phổi do vi khuẩn", "Hô hấp", "nặng",
     ["sốt cao", "ho có đờm", "đau ngực", "khó thở", "ớn lạnh", "vã mồ hôi", "thở nhanh", "mệt mỏi"],
     "Viêm phổi do vi khuẩn, đờm vàng/xanh đặc. Streptococcus, Klebsiella, Pseudomonas...",
     "Kháng sinh phổ rộng, có thể IV nếu nặng. Hỗ trợ hô hấp, truyền dịch. Theo dõi sốc nhiễm khuẩn."),

    ("Viêm phổi do virus", "Hô hấp", "trung bình",
     ["sốt cao", "ho khan", "khó thở", "đau cơ", "mệt mỏi", "đau đầu", "thở nhanh", "mất mùi"],
     "Viêm phổi do virus (Influenza, RSV, SARS-CoV-2). Đờm ít, ho khan.",
     "Điều trị triệu chứng. Tamiflu nếu cúm. Hỗ trợ hô hấp. Cách ly tránh lây."),

    ("Hen phế quản", "Hô hấp", "trung bình",
     ["khó thở", "thở khò khè", "ho khan", "tức ngực", "khó thở đêm", "khó thở gắng sức", "thở rít", "ngứa mũi"],
     "Viêm mạn tính đường hô hấp, co thắt phế quản, có cơ địa dị ứng. Cơn khó thở có hồi phục.",
     "Salbutamol cắt cơn (SABA). ICS-LABA kiểm soát (Symbicort, Seretide). Tránh dị nguyên. Tập thở."),

    ("COPD", "Hô hấp", "nặng",
     ["khó thở gắng sức", "ho có đờm", "thở khò khè", "tức ngực", "mệt mỏi", "tím tái", "sụt cân", "thở nhanh"],
     "Bệnh phổi tắc nghẽn mạn tính, không hồi phục hoàn toàn. Nguyên nhân chính hút thuốc lá lâu năm.",
     "BỎ THUỐC LÁ. LABA-LAMA-ICS xịt. Oxy dài hạn nếu SpO2 thấp. Vaccine cúm, phế cầu. Phục hồi hô hấp."),

    ("Viêm phế quản cấp", "Hô hấp", "nhẹ",
     ["ho có đờm", "ho khan", "đau họng", "sốt nhẹ", "mệt mỏi", "đau ngực", "thở khò khè", "nghẹt mũi"],
     "Viêm cấp niêm mạc phế quản, đa số do virus, tự khỏi 7-10 ngày.",
     "Uống nhiều nước, xông hơi. Salbutamol nếu khò khè. Không cần kháng sinh trừ bội nhiễm."),

    ("Viêm phế quản mạn", "Hô hấp", "trung bình",
     ["ho có đờm", "khó thở gắng sức", "thở khò khè", "đau ngực", "mệt mỏi", "khó thở đêm", "tím tái"],
     "Ho có đờm >3 tháng/năm trong 2 năm liên tiếp. Hay đi kèm COPD ở người hút thuốc.",
     "Bỏ thuốc lá. Long đờm Acetylcystein. Salbutamol xịt khi khò khè. Kháng sinh khi đợt cấp."),

    ("Lao phổi", "Hô hấp", "nặng",
     ["ho có đờm", "ho ra máu", "sốt chiều", "mồ hôi đêm", "sụt cân", "mệt mỏi", "đau ngực", "chán ăn"],
     "Nhiễm Mycobacterium tuberculosis, lây qua không khí. Ho kéo dài >3 tuần là dấu hiệu cảnh báo.",
     "Phác đồ DOTS 6 tháng: 2 tháng HRZE + 4 tháng HR. Cách ly đầu giai đoạn. BCG cho trẻ sơ sinh."),

    ("Tràn dịch màng phổi", "Hô hấp", "nặng",
     ["khó thở", "đau ngực", "ho khan", "sốt nhẹ", "mệt mỏi", "khó thở khi nằm", "thở nhanh", "tím tái"],
     "Dịch tích tụ khoang màng phổi. Nguyên nhân: lao, ung thư, suy tim, viêm phổi.",
     "Chọc dò màng phổi xét nghiệm + tháo dịch. Điều trị nguyên nhân. Dẫn lưu nếu dịch nhiều."),

    ("Tràn khí màng phổi", "Hô hấp", "nguy hiểm",
     ["khó thở", "đau ngực", "thở nhanh", "tím tái", "tim đập nhanh", "hồi hộp", "vã mồ hôi", "ho khan"],
     "Không khí lọt vào khoang màng phổi làm phổi xẹp. Cấp cứu nếu căng (tension pneumothorax).",
     "CẤP CỨU. Chọc tháo khí cấp nếu căng. Đặt dẫn lưu màng phổi. Theo dõi giãn nở phổi."),

    ("Áp xe phổi", "Hô hấp", "nặng",
     ["sốt cao", "ho có đờm", "ho ra máu", "đau ngực", "mệt mỏi", "sụt cân", "mồ hôi đêm", "khó thở"],
     "Mủ tích tụ trong nhu mô phổi do nhiễm khuẩn. Đờm có mùi hôi đặc trưng.",
     "Kháng sinh phổ rộng IV 4-6 tuần (Clindamycin, Cefepime). Dẫn lưu qua nội soi/phẫu thuật nếu cần."),

    ("Giãn phế quản", "Hô hấp", "trung bình",
     ["ho có đờm", "ho ra máu", "khó thở gắng sức", "mệt mỏi", "đau ngực", "sốt nhẹ", "sụt cân"],
     "Phế quản giãn không hồi phục, ứ đọng đờm mủ. Hay do nhiễm trùng tái phát từ nhỏ.",
     "Long đờm, vật lý trị liệu hô hấp. Kháng sinh khi đợt cấp. Phẫu thuật cắt thùy nếu khu trú."),

    ("Viêm tiểu phế quản", "Hô hấp", "trung bình",
     ["khó thở", "thở khò khè", "ho khan", "sốt nhẹ", "thở nhanh", "biếng ăn", "mệt mỏi", "tím tái"],
     "Viêm tiểu phế quản ở trẻ <2 tuổi, hay do RSV. Khò khè, khó thở mùa lạnh.",
     "Hỗ trợ hô hấp, hút mũi, bù dịch. Salbutamol khí dung. Cấp cứu nếu thở nhanh/tím tái."),

    ("Bệnh bụi phổi silic", "Hô hấp", "nặng",
     ["khó thở gắng sức", "ho khan", "ho có đờm", "đau ngực", "mệt mỏi", "sụt cân", "tím tái"],
     "Xơ phổi do hít silic lâu dài (thợ mỏ, đá, gốm). Tiến triển không hồi phục.",
     "Phòng ngừa: khẩu trang lọc, hút bụi. Không có thuốc đặc hiệu. Oxy dài hạn nếu suy hô hấp."),

    ("Ngưng thở khi ngủ", "Hô hấp", "trung bình",
     ["ngưng thở khi ngủ", "ngủ ngáy to", "buồn ngủ", "đau đầu buổi sáng", "mất tập trung", "tim đập nhanh", "mệt mỏi"],
     "Cơn ngưng thở >10s khi ngủ do tắc đường hô hấp trên. Liên quan béo phì, THA.",
     "Giảm cân, tránh rượu trước ngủ. CPAP về đêm là điều trị chuẩn. Phẫu thuật chỉnh hình nếu cần."),

    # ════════════════ THẦN KINH (15) ══════════════════════════════════════════
    ("Đột quỵ não", "Thần kinh", "nguy hiểm",
     ["méo miệng", "nói ngọng", "tê liệt nửa người", "yếu tay", "yếu chân", "đau đầu dữ dội", "mất thị lực", "lú lẫn"],
     "Tổn thương não cấp do nhồi máu hoặc xuất huyết. Cấp cứu trong 'cửa sổ vàng' 4.5h.",
     "CẤP CỨU NGAY. Chụp CT não phân biệt. Tiêu sợi huyết IV nếu nhồi máu <4.5h. Lấy huyết khối cơ học."),

    ("Cơn thiếu máu não thoáng qua", "Thần kinh", "nặng",
     ["méo miệng", "nói khó", "yếu tay", "tê tay", "mờ mắt", "chóng mặt", "đau đầu", "mất trí nhớ"],
     "Đột quỵ hồi phục hoàn toàn <24h. Cảnh báo nguy cơ đột quỵ thật trong vòng 90 ngày tới.",
     "Tầm soát mạch máu não (siêu âm, MRA). Aspirin, Statin. Kiểm soát HA, đái tháo đường, rung nhĩ."),

    ("Động kinh", "Thần kinh", "trung bình",
     ["co giật", "mất ý thức", "co cứng cơ", "chảy nước miếng", "tiểu không tự chủ", "lú lẫn", "đau đầu", "mệt mỏi"],
     "Phóng điện bất thường vỏ não, gây cơn co giật/mất ý thức tái phát.",
     "Thuốc chống động kinh (Valproate, Levetiracetam, Carbamazepine) lâu dài. Tránh thiếu ngủ, rượu, ánh chớp."),

    ("Viêm màng não", "Thần kinh", "nguy hiểm",
     ["đau đầu dữ dội", "sốt cao", "cứng gáy", "sợ ánh sáng", "buồn nôn", "nôn", "lú lẫn", "co giật"],
     "Viêm màng não do vi khuẩn (Neisseria, phế cầu) hoặc virus. Tử vong nhanh nếu không điều trị.",
     "CẤP CỨU. Chọc dò tủy sống chẩn đoán. Kháng sinh IV ngay (Ceftriaxone + Vancomycin). Vaccine phòng ngừa."),

    ("Viêm não Nhật Bản", "Thần kinh", "nguy hiểm",
     ["sốt cao", "đau đầu dữ dội", "co giật", "lú lẫn", "hôn mê", "cứng gáy", "nôn", "liệt"],
     "Nhiễm virus JEV qua muỗi Culex. Tỷ lệ tử vong/di chứng cao, hay gặp trẻ em.",
     "Điều trị hỗ trợ tại ICU. Không có thuốc đặc hiệu. Vaccine JE là biện pháp phòng ngừa chính."),

    ("Migraine", "Thần kinh", "trung bình",
     ["đau nửa đầu", "đau đầu dữ dội", "buồn nôn", "nôn", "sợ ánh sáng", "nhìn chớp sáng", "mất thị lực", "chóng mặt"],
     "Cơn đau đầu một bên, đau theo nhịp mạch, kèm buồn nôn. Có thể có triệu chứng tiền triệu (aura).",
     "Tránh kích thích (rượu, đồ ngọt, stress, thiếu ngủ). Sumatriptan cắt cơn. Propranolol/Topiramate dự phòng."),

    ("Bệnh Parkinson", "Thần kinh", "nặng",
     ["bàn tay run lúc nghỉ", "co cứng cơ", "chậm vận động", "dáng đi nhỏ bước", "mặt ít biểu cảm", "mất thăng bằng", "trầm cảm", "nói lắp"],
     "Thoái hóa neuron dopamine ở chất đen, gây run, cứng, chậm vận động. Hay gặp >60 tuổi.",
     "Levodopa + Carbidopa (Madopar, Sinemet). Dopamine agonist. Phục hồi chức năng, tập vận động."),

    ("Bệnh Alzheimer", "Thần kinh", "nặng",
     ["mất trí nhớ", "lú lẫn", "thay đổi tâm trạng", "mất tập trung", "nói lắp", "dễ kích động", "trầm cảm", "dễ té ngã"],
     "Sa sút trí tuệ tiến triển do thoái hóa não. Hay gặp >65t, bắt đầu bằng giảm trí nhớ gần.",
     "Donepezil, Rivastigmine (chậm tiến triển). Tập luyện trí não, hoạt động xã hội. Hỗ trợ gia đình."),

    ("Sa sút trí tuệ mạch máu", "Thần kinh", "nặng",
     ["mất trí nhớ", "lú lẫn", "chậm vận động", "yếu tay", "yếu chân", "tê liệt nửa người", "dễ té ngã", "mất tập trung"],
     "Sa sút trí tuệ do nhiều ổ nhồi máu não nhỏ. Liên quan THA, ĐTĐ, xơ vữa mạch.",
     "Kiểm soát yếu tố nguy cơ tim mạch. Aspirin, Statin. Tập phục hồi nhận thức."),

    ("Đau dây thần kinh tọa", "Thần kinh", "trung bình",
     ["đau thắt lưng", "đau chân", "tê chân", "yếu chân", "ngứa ran tay chân", "đi tập tễnh", "đau dọc cột sống"],
     "Đau dọc đường đi dây thần kinh tọa từ mông xuống chân, thường do thoát vị đĩa đệm L4-L5, L5-S1.",
     "Nghỉ ngơi tương đối, NSAID, Gabapentin/Pregabalin. Vật lý trị liệu. Phẫu thuật nếu yếu liệt/đau kháng trị."),

    ("Liệt mặt Bell", "Thần kinh", "trung bình",
     ["méo miệng", "nhắm mắt không kín", "khô mắt", "chảy nước miếng", "đau tai", "mất vị giác", "tê mặt"],
     "Liệt dây thần kinh số VII ngoại biên, một bên mặt, hay tự khỏi sau 3-6 tháng.",
     "Prednisolone 60mg/ngày 5-10 ngày (sớm trong 72h). Acyclovir nếu nghi virus. Tập vật lý trị liệu mặt."),

    ("Đau dây thần kinh sinh ba", "Thần kinh", "nặng",
     ["đau dây thần kinh", "đau nửa đầu", "tê mặt", "đau hàm", "đau răng", "đau khi nuốt", "mất tập trung"],
     "Đau như điện giật một bên mặt theo nhánh dây V, đau khi rửa mặt, ăn, nói.",
     "Carbamazepine là thuốc đầu tay. Gabapentin, Baclofen. Phẫu thuật giải áp vi mạch nếu kháng thuốc."),

    ("Hội chứng Guillain-Barré", "Thần kinh", "nguy hiểm",
     ["yếu chân", "tê chân", "yếu tay", "liệt tay", "liệt chân", "khó thở", "khó nuốt", "tê liệt nửa người"],
     "Bệnh tự miễn phá hủy myelin dây thần kinh, gây liệt cấp tiến triển. Có thể liệt cơ hô hấp.",
     "Nhập viện theo dõi hô hấp. IVIg hoặc thay huyết tương sớm. Phục hồi chức năng dài hạn."),

    ("U não", "Thần kinh", "nguy hiểm",
     ["đau đầu", "đau đầu buổi sáng", "buồn nôn", "nôn", "co giật", "yếu tay", "mờ mắt", "lú lẫn"],
     "Khối u nội sọ lành/ác. Triệu chứng tăng áp lực nội sọ (đau đầu, nôn, phù gai thị) và khu trú.",
     "MRI não chẩn đoán. Phẫu thuật cắt u + xạ trị/hóa trị tùy loại. Steroid giảm phù não."),

    ("Rối loạn tiền đình", "Thần kinh", "nhẹ",
     ["chóng mặt xoay", "buồn nôn", "nôn", "ù tai", "mất thăng bằng", "đau đầu", "hoa mắt", "vã mồ hôi"],
     "Rối loạn cảm giác thăng bằng. Có thể do BPPV, viêm tiền đình, Meniere.",
     "Nghiệm pháp Epley cho BPPV. Betahistine, Cinnarizine. Tập tiền đình. Tránh thay đổi tư thế đột ngột."),

    # ════════════════ CƠ XƯƠNG KHỚP (15) ══════════════════════════════════════
    ("Viêm khớp dạng thấp", "Cơ xương khớp", "nặng",
     ["đau khớp", "sưng khớp", "cứng khớp buổi sáng", "biến dạng khớp", "mệt mỏi", "sốt nhẹ", "sụt cân", "chán ăn"],
     "Bệnh tự miễn viêm nhiều khớp đối xứng, đặc biệt bàn tay. RF, anti-CCP dương tính.",
     "Methotrexate là thuốc nền. Sinh học (Anti-TNF) nếu kháng trị. NSAID giảm đau. Vật lý trị liệu."),

    ("Thoái hóa khớp gối", "Cơ xương khớp", "trung bình",
     ["đau khớp", "cứng khớp", "tiếng khớp kêu", "sưng khớp", "hạn chế vận động", "đi tập tễnh", "đau khi đi"],
     "Hư sụn khớp gối do tuổi, béo phì, chấn thương cũ. Đau tăng khi vận động, giảm khi nghỉ.",
     "Giảm cân, tập cơ tứ đầu đùi. Glucosamine, NSAID khi đau. Tiêm hyaluronic acid. Thay khớp khi nặng."),

    ("Thoái hóa cột sống cổ", "Cơ xương khớp", "trung bình",
     ["đau cổ", "cứng cổ", "đau gáy", "đau lan vai trái", "tê tay", "yếu tay", "đau đầu", "chóng mặt"],
     "Hư đĩa đệm và đốt sống cổ do tuổi. Có thể chèn ép rễ thần kinh hoặc tủy.",
     "Nghỉ ngơi tư thế, kê gối thấp. NSAID, giãn cơ. Vật lý trị liệu, kéo giãn cổ. Phẫu thuật khi chèn ép tủy."),

    ("Thoái hóa cột sống thắt lưng", "Cơ xương khớp", "trung bình",
     ["đau thắt lưng", "đau lưng dưới", "cứng lưng", "đau chân", "tê chân", "đau dọc cột sống", "hạn chế vận động"],
     "Hư đĩa đệm, gai cột sống thắt lưng. Đau khi đứng lâu, mang vác nặng.",
     "Tập cơ lưng, tránh mang nặng. NSAID, giãn cơ. Tiêm steroid ngoài màng cứng. Phẫu thuật nếu cần."),

    ("Gout", "Cơ xương khớp", "trung bình",
     ["đau khớp", "sưng khớp", "đỏ khớp", "nóng khớp", "đau giữa đêm", "sốt nhẹ", "biến dạng khớp"],
     "Bệnh lắng đọng tinh thể urate ở khớp, hay ngón chân cái. Acid uric máu tăng.",
     "Cơn cấp: Colchicine, NSAID, Steroid. Dự phòng: Allopurinol, Febuxostat. Hạn chế bia, thịt đỏ, hải sản."),

    ("Thoát vị đĩa đệm cột sống cổ", "Cơ xương khớp", "nặng",
     ["đau cổ", "đau gáy", "đau lan vai trái", "tê tay", "yếu tay", "khó cầm nắm", "đau đầu", "cứng cổ"],
     "Nhân nhầy đĩa đệm cột sống cổ thoát ra chèn ép rễ thần kinh.",
     "Bất động cổ, NSAID, Gabapentin. Vật lý trị liệu. Phẫu thuật nếu yếu liệt, đau kháng trị."),

    ("Thoát vị đĩa đệm cột sống thắt lưng", "Cơ xương khớp", "nặng",
     ["đau thắt lưng", "đau chân", "tê chân", "yếu chân", "ngứa ran tay chân", "đau dọc cột sống", "đi tập tễnh"],
     "Nhân nhầy đĩa đệm thắt lưng thoát ra, chèn rễ thần kinh, gây đau lan chân (đau dây thần kinh tọa).",
     "NSAID, Pregabalin. Vật lý trị liệu, kéo giãn. Tiêm ngoài màng cứng. Phẫu thuật nếu yếu liệt."),

    ("Loãng xương", "Cơ xương khớp", "trung bình",
     ["đau lưng", "đau xương", "gãy xương dễ", "giảm chiều cao", "đau khi đi", "mệt mỏi"],
     "Giảm mật độ xương, dễ gãy xương khi ngã nhẹ. Hay gặp phụ nữ sau mãn kinh.",
     "Bổ sung Calcium 1000mg + Vitamin D3 800UI/ngày. Bisphosphonate (Alendronate). Tập chịu lực."),

    ("Viêm khớp nhiễm khuẩn", "Cơ xương khớp", "nguy hiểm",
     ["đau khớp", "sưng khớp", "đỏ khớp", "nóng khớp", "sốt cao", "ớn lạnh", "hạn chế vận động"],
     "Nhiễm khuẩn trong khoang khớp (Staph, Strep, Gonococcus). Cần dẫn lưu sớm tránh hư khớp.",
     "CẤP CỨU. Chọc khớp cấy + nhuộm Gram. Kháng sinh IV phổ rộng. Dẫn lưu khớp ngoại khoa nếu cần."),

    ("Bong gân cổ chân", "Cơ xương khớp", "nhẹ",
     ["đau khớp", "sưng khớp", "bầm tím", "hạn chế vận động", "đi tập tễnh", "đau khi đi"],
     "Tổn thương dây chằng cổ chân khi lật chân, mức độ I-III.",
     "RICE: Nghỉ ngơi, Đá lạnh, Băng ép, Kê cao. NSAID. Tập phục hồi sớm. Phẫu thuật nếu đứt hoàn toàn."),

    ("Gãy xương đùi", "Cơ xương khớp", "nguy hiểm",
     ["đau xương", "biến dạng khớp", "đau khớp", "không đi được", "sưng phù", "bầm tím", "đau khi đi"],
     "Gãy xương đùi do chấn thương hoặc loãng xương. Người già nguy cơ tử vong cao.",
     "Cấp cứu cố định. Phẫu thuật kết hợp xương sớm (24-48h). Phòng huyết khối, viêm phổi. Phục hồi chức năng."),

    ("Viêm bao hoạt dịch", "Cơ xương khớp", "nhẹ",
     ["đau khớp", "sưng khớp", "nóng khớp", "đỏ khớp", "hạn chế vận động", "tiếng khớp kêu"],
     "Viêm bao hoạt dịch quanh khớp (vai, khuỷu, gối). Hay do vận động lặp lại, chấn thương.",
     "Nghỉ ngơi khớp, chườm đá. NSAID. Tiêm corticoid trong bao. Vật lý trị liệu."),

    ("Hội chứng ống cổ tay", "Cơ xương khớp", "trung bình",
     ["tê tay", "đau tay", "yếu tay", "khó cầm nắm", "ngứa ran tay chân", "đau giữa đêm"],
     "Chèn ép dây thần kinh giữa ở cổ tay. Tê các ngón I-IV, hay xảy ra ban đêm.",
     "Đeo nẹp cổ tay ban đêm. NSAID. Tiêm steroid tại chỗ. Phẫu thuật giải áp nếu nặng/teo cơ."),

    ("Viêm cột sống dính khớp", "Cơ xương khớp", "nặng",
     ["đau lưng", "cứng lưng", "đau lưng dưới", "cứng khớp buổi sáng", "đau dọc cột sống", "đau khớp", "mệt mỏi"],
     "Viêm khớp tự miễn liên quan HLA-B27, dính khớp cùng chậu và cột sống. Nam trẻ tuổi.",
     "NSAID liên tục. Sinh học Anti-TNF nếu kháng trị. Tập vận động cột sống. Tư thế tốt."),

    ("Lupus ban đỏ hệ thống", "Cơ xương khớp", "nặng",
     ["đau khớp", "sưng khớp", "phát ban", "mệt mỏi", "sốt nhẹ", "rụng tóc", "sợ ánh sáng", "đau cơ"],
     "Bệnh tự miễn đa cơ quan, ban cánh bướm má, viêm khớp, viêm thận, huyết học. ANA dương tính.",
     "Hydroxychloroquine nền. Corticoid khi đợt nặng. Tránh nắng, chống nắng SPF 50+. Theo dõi thận."),

    # ════════════════ DA LIỄU (15) ════════════════════════════════════════════
    ("Viêm da dị ứng", "Da liễu", "nhẹ",
     ["ngứa da", "phát ban", "đỏ da", "khô da", "bong tróc da", "mụn nước", "nóng rát da"],
     "Bệnh da viêm mạn tính, ngứa nhiều, hay tái phát. Liên quan cơ địa dị ứng (hen, viêm mũi).",
     "Dưỡng ẩm 2 lần/ngày. Corticoid bôi đợt ngắn. Tránh dị nguyên. Kháng histamin uống nếu ngứa."),

    ("Mề đay", "Da liễu", "nhẹ",
     ["nổi mề đay", "ngứa da", "mẩn đỏ", "phù mí mắt", "phù mặt", "phát ban"],
     "Phản ứng dị ứng nổi sẩn phù ngứa, có thể tự lặn trong 24h. Cấp <6 tuần, mạn >6 tuần.",
     "Kháng histamin H1 thế hệ 2 (Loratadine, Cetirizine). Tránh dị nguyên. Adrenaline nếu phù mạch."),

    ("Vảy nến", "Da liễu", "trung bình",
     ["vảy bạc trên da", "đỏ da", "ngứa da", "bong tróc da", "dày sừng", "đau khớp", "nhiễm nấm móng"],
     "Bệnh tự miễn mạn tính, mảng đỏ phủ vảy trắng bạc, hay khuỷu, gối, da đầu.",
     "Calcipotriol + corticoid bôi. UVB chiếu da. Methotrexate, sinh học nếu nặng. Dưỡng ẩm thường xuyên."),

    ("Eczema", "Da liễu", "nhẹ",
     ["ngứa da", "đỏ da", "mụn nước", "bong tróc da", "khô da", "nóng rát da", "phát ban"],
     "Viêm da tiếp xúc hoặc cơ địa, đỏ ngứa rỉ dịch. Hay ở tay (eczema bàn tay).",
     "Tránh tiếp xúc dị nguyên/kích ứng. Dưỡng ẩm, corticoid bôi. Tacrolimus bôi mạn tính."),

    ("Zona thần kinh", "Da liễu", "trung bình",
     ["mụn nước theo dải", "đau dây thần kinh", "nóng rát da", "ngứa da", "phát ban", "sốt nhẹ", "mệt mỏi"],
     "Tái hoạt động virus Varicella-Zoster dọc một dây thần kinh, mụn nước theo dermatome.",
     "Acyclovir 800mg x5/ngày trong 7 ngày (sớm <72h). Giảm đau, Gabapentin nếu đau thần kinh sau zona."),

    ("Nấm da", "Da liễu", "nhẹ",
     ["ngứa da", "phát ban", "đỏ da", "bong tróc da", "vảy bạc trên da", "vết loét da"],
     "Nhiễm nấm Dermatophyte ở da, dạng vòng tròn đỏ có vảy. Hay ở vùng kẽ, da ẩm.",
     "Kem chống nấm (Ketoconazole, Terbinafine) 2-4 tuần. Giữ khô vùng da. Uống nếu lan rộng."),

    ("Hắc lào", "Da liễu", "nhẹ",
     ["ngứa da", "phát ban", "vảy bạc trên da", "đỏ da", "bong tróc da", "nóng rát da"],
     "Nấm da do Trichophyton, vòng tròn đỏ có viền hồng, ngứa nhiều. Lây qua tiếp xúc.",
     "Bôi Ketoconazole/Clotrimazole 2-4 tuần. Giữ khô, thay quần áo sạch. Điều trị người tiếp xúc."),

    ("Ghẻ", "Da liễu", "nhẹ",
     ["ngứa da", "ngứa giữa đêm", "phát ban", "mụn nước", "mẩn đỏ", "đường hầm da", "ngứa toàn thân"],
     "Nhiễm ký sinh trùng Sarcoptes scabiei, ngứa dữ dội về đêm. Đường hầm ở kẽ ngón.",
     "Bôi Permethrin 5% toàn thân, lặp lại sau 1 tuần. Giặt quần áo nóng. Điều trị cả gia đình."),

    ("Nấm móng", "Da liễu", "nhẹ",
     ["nhiễm nấm móng", "móng dày", "móng giòn", "móng vàng", "móng đổi màu", "đau ngón chân"],
     "Nhiễm nấm Dermatophyte ở móng, móng dày vàng giòn. Khó điều trị, hay tái phát.",
     "Terbinafine uống 6-12 tuần. Bôi Amorolfine. Cắt móng bệnh, giữ chân khô. Khử trùng giày."),

    ("Mụn trứng cá", "Da liễu", "nhẹ",
     ["nổi mụn", "mụn mủ", "đỏ da", "nốt sần", "sạm da", "vết loét da"],
     "Viêm tuyến bã do Cutibacterium acnes, hay tuổi dậy thì. Mụn đầu đen, mụn mủ.",
     "Rửa mặt 2 lần/ngày, sữa rửa mặt dịu. Retinoid bôi, Benzoyl Peroxide. Isotretinoin uống nếu nặng."),

    ("Viêm nang lông", "Da liễu", "nhẹ",
     ["nổi mụn", "mụn mủ", "ngứa da", "đỏ da", "đau nhẹ", "nốt sần"],
     "Viêm chân nang lông do vi khuẩn/nấm. Mụn mủ quanh nang lông.",
     "Vệ sinh sạch, tránh cạo lông. Bôi Mupirocin, Clindamycin. Uống nếu lan rộng."),

    ("Nám da", "Da liễu", "nhẹ",
     ["nám da", "sạm da", "phát ban"],
     "Tăng sắc tố da do nội tiết, ánh nắng, thuốc tránh thai. Hay ở phụ nữ, vùng mặt.",
     "Chống nắng SPF 50+ là quan trọng nhất. Hydroquinone, Tretinoin, Azelaic acid bôi. Peel hóa học, laser."),

    ("Bạch biến", "Da liễu", "nhẹ",
     ["mảng trắng trên da", "phát ban", "bong tróc da"],
     "Mất sắc tố melanin từng vùng da, do tự miễn. Mảng trắng đối xứng, không ngứa.",
     "Corticoid bôi, Tacrolimus. UVB chiếu da phổ hẹp. Chống nắng. Trang điểm che phủ."),

    ("Rụng tóc từng vùng", "Da liễu", "nhẹ",
     ["rụng tóc từng vùng", "rụng tóc", "ngứa da", "móng đổi màu"],
     "Bệnh tự miễn rụng tóc thành đốm tròn nhẵn, có thể lan toàn da đầu (alopecia totalis).",
     "Corticoid tiêm tại chỗ. Minoxidil bôi. JAK inhibitor nếu lan rộng. Tâm lý liệu pháp."),

    ("U hắc tố ác tính", "Da liễu", "nguy hiểm",
     ["nốt ruồi đổi màu", "vết loét da", "ngứa da", "chảy máu da", "hạch to", "sụt cân", "mệt mỏi"],
     "Ung thư da nguy hiểm nhất từ tế bào melanocyte. Quy tắc ABCDE đánh giá nốt ruồi.",
     "Phẫu thuật cắt rộng + sinh thiết hạch gác. Immunotherapy (PD-1) nếu di căn. Chống nắng phòng ngừa."),

    # ════════════════ MẮT (10) ═════════════════════════════════════════════════
    ("Đục thủy tinh thể", "Mắt", "trung bình",
     ["mờ mắt", "nhìn đôi", "sợ ánh sáng", "nhìn quầng sáng", "đỏ mắt", "khó nhìn ban đêm"],
     "Thủy tinh thể đục dần, gây giảm thị lực tiến triển. Hay gặp >60 tuổi, ĐTĐ, sau chấn thương.",
     "Phẫu thuật phaco thay thủy tinh thể nhân tạo (IOL) khi ảnh hưởng sinh hoạt. Không có thuốc nội khoa."),

    ("Glaucoma góc đóng", "Mắt", "nguy hiểm",
     ["đau mắt", "đau đầu dữ dội", "nhìn quầng sáng", "mờ mắt", "đỏ mắt", "buồn nôn", "nôn", "mất thị lực"],
     "Cơn tăng nhãn áp cấp do tắc lưu thông thủy dịch. Cấp cứu, có thể mù vĩnh viễn trong 24h.",
     "CẤP CỨU. Hạ nhãn áp khẩn: Pilocarpine, Acetazolamide IV, Mannitol. Laser cắt mống chu biên."),

    ("Viêm kết mạc", "Mắt", "nhẹ",
     ["đỏ mắt", "ngứa mắt", "chảy nước mắt", "ghèn mắt", "cộm mắt", "sưng mi mắt"],
     "Viêm màng kết mạc do virus, vi khuẩn, dị ứng. 'Đau mắt đỏ' lây qua tiếp xúc.",
     "Vệ sinh mắt sạch. Kháng sinh nhỏ (Tobramycin) nếu vi khuẩn. Antihistamin nếu dị ứng. Cách ly."),

    ("Viêm giác mạc", "Mắt", "nặng",
     ["đau mắt", "đỏ mắt", "chảy nước mắt", "sợ ánh sáng", "mờ mắt", "cộm mắt", "mất thị lực"],
     "Viêm giác mạc do virus (HSV), vi khuẩn, nấm. Để lại sẹo giác mạc, mất thị lực.",
     "Khám chuyên khoa mắt khẩn. Acyclovir nếu HSV. Kháng sinh nhỏ mạnh nếu vi khuẩn. Tránh tự ý dùng steroid."),

    ("Cận thị", "Mắt", "nhẹ",
     ["mờ mắt", "khó nhìn xa", "đau đầu", "mỏi mắt", "nheo mắt"],
     "Mắt nhìn gần rõ, nhìn xa mờ. Trục nhãn cầu dài hơn bình thường. Tiến triển ở trẻ tuổi.",
     "Đeo kính phân kỳ. Kính áp tròng. Phẫu thuật khúc xạ (LASIK) khi >18t, độ ổn định."),

    ("Viễn thị", "Mắt", "nhẹ",
     ["mờ mắt", "khó nhìn gần", "đau đầu", "mỏi mắt", "khô mắt"],
     "Mắt nhìn xa rõ hơn, nhìn gần mờ. Trục nhãn cầu ngắn. Người già càng nặng.",
     "Đeo kính hội tụ. Phẫu thuật khúc xạ. Khám mắt định kỳ."),

    ("Loạn thị", "Mắt", "nhẹ",
     ["mờ mắt", "nhìn đôi", "đau đầu", "mỏi mắt", "nheo mắt"],
     "Giác mạc không tròn đều, ảnh bị méo. Có thể kèm cận hoặc viễn thị.",
     "Kính loạn thị có trụ. Kính áp tròng toric. Phẫu thuật khúc xạ."),

    ("Lác mắt", "Mắt", "nhẹ",
     ["nhìn đôi", "lác mắt", "mỏi mắt", "đau đầu", "khó nhìn"],
     "Hai mắt không thẳng trục, có thể lác trong/ngoài. Trẻ em cần điều trị sớm tránh nhược thị.",
     "Bịt mắt tốt rèn mắt yếu. Kính điều chỉnh. Phẫu thuật chỉnh cơ vận nhãn nếu cần."),

    ("Viêm bờ mi", "Mắt", "nhẹ",
     ["sưng mi mắt", "đỏ mắt", "ngứa mắt", "cộm mắt", "khô mắt", "ghèn mắt"],
     "Viêm bờ mi do vi khuẩn, mạch lương, demodex. Mắt cộm, đỏ bờ mi.",
     "Chườm ấm bờ mi 5-10 phút x2/ngày. Vệ sinh bờ mi với sữa rửa chuyên dụng. Kháng sinh mỡ nếu cần."),

    ("Bong võng mạc", "Mắt", "nguy hiểm",
     ["nhìn chớp sáng", "nhìn vệt đen", "mờ mắt", "mất thị lực", "nhìn quầng sáng"],
     "Võng mạc bong khỏi lớp sắc tố, cấp cứu để cứu thị lực. Cận thị nặng, sau mổ mắt có nguy cơ.",
     "CẤP CỨU mắt. Laser khóa rách võng mạc nếu sớm. Phẫu thuật áp võng mạc (vitrectomy, scleral buckle)."),

    # ════════════════ TAI MŨI HỌNG (12) ═══════════════════════════════════════
    ("Viêm họng cấp", "Tai Mũi Họng", "nhẹ",
     ["đau họng", "rát họng", "khó nuốt", "sốt nhẹ", "ho khan", "khàn giọng", "mệt mỏi", "sưng hạch cổ"],
     "Viêm cấp niêm mạc họng, đa số do virus, vài % do liên cầu nhóm A.",
     "Súc miệng nước muối, ngậm Strepsil. Paracetamol giảm đau. Kháng sinh chỉ khi test Strep dương."),

    ("Viêm amidan cấp", "Tai Mũi Họng", "trung bình",
     ["đau họng", "khó nuốt", "sốt cao", "sưng hạch cổ", "khàn giọng", "amidan sưng đỏ", "hôi miệng", "đau tai"],
     "Viêm amidan do virus hoặc liên cầu. Amidan đỏ to, có thể có mủ.",
     "Penicillin V hoặc Amoxicillin 10 ngày nếu vi khuẩn. Nghỉ ngơi, uống nhiều nước. Cắt amidan nếu tái phát."),

    ("Viêm thanh quản", "Tai Mũi Họng", "nhẹ",
     ["khàn giọng", "mất tiếng", "đau họng", "ho khan", "sốt nhẹ", "khó nuốt", "ngứa họng"],
     "Viêm dây thanh do nhiễm trùng, la hét, trào ngược, hút thuốc.",
     "Nghỉ giọng, uống ấm. Xông hơi. Tránh kích thích (khói, rượu). Trị trào ngược nếu có."),

    ("Viêm xoang cấp", "Tai Mũi Họng", "trung bình",
     ["đau đầu", "chảy mũi đặc", "nghẹt mũi", "đau hàm", "sốt nhẹ", "mất mùi", "ho khan", "đau tai"],
     "Viêm xoang <4 tuần, hay sau cảm cúm. Đau vùng xoang khi cúi.",
     "Nước muối xịt rửa mũi. Corticoid xịt mũi. Kháng sinh Amoxicillin nếu kéo dài >10 ngày."),

    ("Viêm xoang mạn", "Tai Mũi Họng", "trung bình",
     ["đau đầu", "chảy mũi đặc", "nghẹt mũi", "mất mùi", "ho khan", "đau hàm", "mệt mỏi", "khó tập trung"],
     "Viêm xoang >12 tuần, có thể có polyp mũi. Triệu chứng kéo dài, hay tái phát.",
     "Corticoid xịt mũi dài hạn. Nước muối rửa mũi. Phẫu thuật nội soi xoang nếu kháng trị."),

    ("Viêm tai giữa cấp", "Tai Mũi Họng", "trung bình",
     ["đau tai", "ù tai", "sốt cao", "nghe kém", "chảy mủ tai", "đau đầu", "khó chịu", "quấy khóc"],
     "Viêm tai giữa cấp, hay gặp ở trẻ em sau nhiễm trùng đường hô hấp.",
     "Paracetamol giảm đau. Kháng sinh Amoxicillin nếu nặng/<2t. Đặt ống thông khí nếu tái phát."),

    ("Viêm tai ngoài", "Tai Mũi Họng", "nhẹ",
     ["đau tai", "ngứa tai", "chảy mủ tai", "sưng ống tai", "nghe kém", "ù tai"],
     "Viêm ống tai ngoài do vi khuẩn, nấm. Hay gặp 'tai bơi'.",
     "Vệ sinh tai khô. Nhỏ tai kháng sinh + corticoid (Ciprodex). Tránh ngoáy tai. Bảo vệ tai khi bơi."),

    ("Polyp mũi", "Tai Mũi Họng", "trung bình",
     ["nghẹt mũi", "chảy mũi đặc", "mất mùi", "ngạt thở", "đau đầu", "ngủ ngáy"],
     "Khối thịt thừa trong khoang mũi, gây tắc, kèm viêm xoang mạn. Liên quan dị ứng, hen.",
     "Corticoid xịt mũi dài hạn. Corticoid uống đợt ngắn. Phẫu thuật nội soi cắt polyp nếu lớn."),

    ("Lệch vách ngăn mũi", "Tai Mũi Họng", "nhẹ",
     ["nghẹt mũi", "chảy máu mũi", "đau đầu", "ngủ ngáy", "khó thở qua mũi", "mất mùi"],
     "Vách ngăn mũi lệch một bên, gây nghẹt mũi một bên. Có thể do chấn thương, bẩm sinh.",
     "Corticoid xịt mũi nếu triệu chứng nhẹ. Phẫu thuật chỉnh hình vách ngăn (septoplasty)."),

    ("Ung thư vòm họng", "Tai Mũi Họng", "nguy hiểm",
     ["sưng hạch cổ", "chảy máu mũi", "nghẹt mũi", "ù tai", "khàn giọng", "đau đầu", "sụt cân", "đau tai"],
     "Ung thư biểu mô vòm họng, liên quan EBV, di truyền. Hạch cổ là triệu chứng đầu tiên.",
     "Sinh thiết qua nội soi. Xạ trị là điều trị chính + hóa trị. Tầm soát EBV ở vùng dịch tễ."),

    ("Chóng mặt Meniere", "Tai Mũi Họng", "trung bình",
     ["chóng mặt xoay", "ù tai", "nghe kém", "buồn nôn", "nôn", "mất thăng bằng", "đau tai"],
     "Cơn chóng mặt do rối loạn dịch tai trong. Bộ ba: chóng mặt, ù tai, nghe kém.",
     "Hạn chế muối, caffeine. Betahistine. Lợi tiểu Hydrochlorothiazide. Tiêm Gentamicin nội tai nếu kháng trị."),

    ("Điếc đột ngột", "Tai Mũi Họng", "nguy hiểm",
     ["điếc đột ngột", "ù tai", "chóng mặt", "nghe kém", "đau tai"],
     "Mất thính lực thần kinh đột ngột trong <72h. Cấp cứu, điều trị sớm trong 2 tuần.",
     "Corticoid uống liều cao 1-2 tuần. Tiêm corticoid nội nhĩ. Có thể không hồi phục nếu muộn."),

    # ════════════════ NỘI TIẾT (12) ═══════════════════════════════════════════
    ("Đái tháo đường type 1", "Nội tiết", "nặng",
     ["khát nước nhiều", "tiểu nhiều", "sụt cân", "mệt mỏi", "đói nhiều", "mờ mắt", "vết thương lâu lành", "buồn nôn"],
     "Phá hủy tế bào beta tụy do tự miễn, thiếu insulin tuyệt đối. Khởi phát trẻ tuổi.",
     "Insulin tiêm dưới da đa lần hoặc bơm. Đếm carbohydrate. Đường huyết liên tục (CGM). Tránh hạ đường huyết."),

    ("Đái tháo đường type 2", "Nội tiết", "trung bình",
     ["khát nước nhiều", "tiểu nhiều", "mệt mỏi", "mờ mắt", "vết thương lâu lành", "tê tay", "tê chân", "ngứa da"],
     "Kháng insulin, hay đi kèm béo phì, tuổi >40, di truyền. Tiến triển từ từ.",
     "Metformin đầu tay. Thay đổi lối sống: giảm cân, ăn ít tinh bột, tập 150 phút/tuần. SGLT2i nếu có bệnh tim/thận."),

    ("Đái tháo đường thai kỳ", "Nội tiết", "trung bình",
     ["khát nước nhiều", "tiểu nhiều", "mệt mỏi", "mờ mắt", "tăng cân nhanh", "buồn nôn"],
     "Đường huyết tăng trong thai kỳ. Tăng nguy cơ tiền sản giật, thai to.",
     "Chế độ ăn kiểm soát, đo đường huyết 4 lần/ngày. Insulin nếu chế độ ăn không kiểm soát được."),

    ("Cường giáp", "Nội tiết", "trung bình",
     ["sụt cân", "tim đập nhanh", "hồi hộp", "run tay", "vã mồ hôi", "ngủ kém", "đi ngoài nhiều", "lo âu"],
     "Tuyến giáp tăng sản xuất hormone (Basedow, nhân độc). FT4 cao, TSH thấp.",
     "Methimazole hoặc PTU. I-131 đốt tuyến. Beta-blocker giảm triệu chứng tim. Phẫu thuật cắt giáp nếu cần."),

    ("Suy giáp", "Nội tiết", "trung bình",
     ["mệt mỏi", "tăng cân", "lạnh", "táo bón", "rụng tóc", "phù mặt", "trầm cảm", "chậm chạp"],
     "Tuyến giáp thiếu hormone (Hashimoto, sau xạ trị). TSH cao, FT4 thấp.",
     "Levothyroxine sáng sớm khi đói, suốt đời. Theo dõi TSH 6-12 tuần đầu, sau đó hàng năm."),

    ("Bướu cổ đơn thuần", "Nội tiết", "nhẹ",
     ["bướu cổ", "sưng hạch cổ", "khó nuốt", "khó thở", "khàn giọng"],
     "Tuyến giáp to không kèm rối loạn chức năng. Nguyên nhân thiếu i-ốt, di truyền.",
     "Bổ sung iod (muối iod). Theo dõi siêu âm. Phẫu thuật nếu chèn ép, lo ngại ung thư."),

    ("Viêm tuyến giáp Hashimoto", "Nội tiết", "trung bình",
     ["mệt mỏi", "tăng cân", "bướu cổ", "lạnh", "rụng tóc", "trầm cảm", "phù mặt"],
     "Bệnh tự miễn phá hủy tuyến giáp dần, dẫn đến suy giáp. Anti-TPO, anti-Tg dương.",
     "Levothyroxine khi đã suy giáp. Theo dõi định kỳ trước khi suy giáp."),

    ("Hội chứng Cushing", "Nội tiết", "nặng",
     ["mặt tròn như mặt trăng", "tăng cân", "rạn da", "lông tóc rậm", "da mặt đỏ ửng", "loãng xương", "mất ngủ", "trầm cảm"],
     "Thừa cortisol nội sinh (u tuyến yên, u thượng thận) hoặc ngoại sinh (corticoid).",
     "Tìm nguyên nhân: chụp tuyến yên, thượng thận. Phẫu thuật khối u. Ngừng corticoid từ từ."),

    ("Bệnh Addison", "Nội tiết", "nguy hiểm",
     ["mệt mỏi", "sạm da", "sụt cân", "buồn nôn", "đau bụng", "tụt huyết áp", "chóng mặt", "khát nước"],
     "Suy thượng thận nguyên phát, thiếu cortisol và aldosterone. Có thể gây cơn suy cấp.",
     "Hydrocortisone + Fludrocortisone thay thế suốt đời. Tăng liều khi stress (sốt, phẫu thuật)."),

    ("Béo phì", "Nội tiết", "trung bình",
     ["tăng cân", "khó thở gắng sức", "đau khớp", "ngủ ngáy", "mệt mỏi", "đau lưng"],
     "BMI ≥30 (Asian ≥27.5). Yếu tố nguy cơ ĐTĐ, THA, bệnh tim mạch, ung thư.",
     "Giảm 500-1000 kcal/ngày. Tập 150 phút/tuần. Liraglutide, Semaglutide. Phẫu thuật giảm cân khi BMI >40."),

    ("Hạ đường huyết", "Nội tiết", "nguy hiểm",
     ["vã mồ hôi", "run tay", "hồi hộp", "đói nhiều", "chóng mặt", "lú lẫn", "co giật", "mất ý thức"],
     "Đường huyết <70 mg/dL. Nguy hiểm: hôn mê, tổn thương não. Hay ở bệnh nhân ĐTĐ.",
     "Uống 15g glucose nhanh nếu tỉnh. Glucagon tiêm hoặc Glucose IV nếu hôn mê. Điều chỉnh insulin/thuốc."),

    ("Đái tháo nhạt", "Nội tiết", "trung bình",
     ["tiểu nhiều", "khát nước nhiều", "mệt mỏi", "mất ngủ", "sụt cân"],
     "Thiếu ADH (trung ương) hoặc thận không đáp ứng ADH. Tiểu rất nhiều, nước tiểu loãng.",
     "Desmopressin (DDAVP) xịt mũi/uống nếu trung ương. HCTZ, ăn ít muối nếu thận. Bù nước đầy đủ."),

    # ════════════════ HUYẾT HỌC (10) ══════════════════════════════════════════
    ("Thiếu máu thiếu sắt", "Huyết học", "trung bình",
     ["mệt mỏi", "da xanh tái", "chóng mặt", "khó thở gắng sức", "tim đập nhanh", "đau đầu", "tóc rụng", "móng giòn"],
     "Thiếu sắt do mất máu (kinh nguyệt, tiêu hóa), ăn ít sắt, kém hấp thu. Hb thấp, MCV thấp.",
     "Sắt uống Ferrous sulfate 200mg x3/ngày, cùng vitamin C. Tìm nguyên nhân mất máu. Truyền máu nếu nặng."),

    ("Thiếu máu tan máu", "Huyết học", "nặng",
     ["mệt mỏi", "da xanh tái", "vàng da", "nước tiểu sẫm", "khó thở", "tim đập nhanh", "đau bụng", "sốt nhẹ"],
     "Hồng cầu bị phá hủy nhanh hơn sản xuất, hay do tự miễn (AIHA), G6PD, thalassemia.",
     "Corticoid nếu AIHA. Tránh thuốc oxy hóa nếu G6PD. Cắt lách trong vài trường hợp. Truyền máu khi nặng."),

    ("Thiếu máu hồng cầu to", "Huyết học", "trung bình",
     ["mệt mỏi", "da xanh tái", "lưỡi bợt", "tê tay", "tê chân", "trí nhớ giảm", "buồn nôn"],
     "Thiếu B12 hoặc Folate, MCV cao. B12 thiếu kèm triệu chứng thần kinh.",
     "Tiêm bắp B12 nếu thiếu B12 (Pernicious anemia). Folate uống nếu thiếu folate. Tìm nguyên nhân."),

    ("Xuất huyết giảm tiểu cầu", "Huyết học", "nặng",
     ["xuất huyết da", "bầm tím", "chảy máu mũi", "chảy máu chân răng", "rong kinh", "phân có máu", "mệt mỏi"],
     "Giảm tiểu cầu do tự miễn (ITP), thuốc, nhiễm trùng. Tiểu cầu <100,000/µL.",
     "Corticoid là điều trị đầu tay. IVIg nếu nặng. Rituximab, Eltrombopag, cắt lách nếu kháng trị."),

    ("Bạch cầu cấp dòng tủy", "Huyết học", "nguy hiểm",
     ["sốt cao", "mệt mỏi", "da xanh tái", "xuất huyết da", "bầm tím", "hạch to", "sụt cân", "đau xương"],
     "Ung thư máu cấp tính, tăng sinh tế bào non dòng tủy. Tiến triển nhanh, cần điều trị ngay.",
     "Hóa trị tấn công (cytarabine + anthracycline). Ghép tủy nếu có chỉ định. Hỗ trợ huyết học."),

    ("Bạch cầu mạn dòng tủy", "Huyết học", "nặng",
     ["mệt mỏi", "sụt cân", "lách to", "đau hạ sườn trái", "mồ hôi đêm", "sốt nhẹ", "ngứa da"],
     "Bệnh ác tính dòng tủy, gen BCR-ABL dương. Tiến triển 3 giai đoạn: mạn-tăng tốc-blast.",
     "TKI: Imatinib, Dasatinib, Nilotinib. Theo dõi BCR-ABL bằng PCR. Ghép tủy nếu thất bại TKI."),

    ("U lympho Hodgkin", "Huyết học", "nặng",
     ["hạch to", "sốt chiều", "mồ hôi đêm", "sụt cân", "ngứa da", "mệt mỏi", "đau ngực", "ho khan"],
     "Ung thư hệ bạch huyết, tế bào Reed-Sternberg đặc trưng. Tỷ lệ chữa khỏi cao.",
     "Phác đồ ABVD hóa trị + xạ trị. Tỷ lệ sống >85% ở giai đoạn sớm. Theo dõi tái phát."),

    ("U lympho không Hodgkin", "Huyết học", "nặng",
     ["hạch to", "sốt chiều", "mồ hôi đêm", "sụt cân", "mệt mỏi", "đau bụng", "ho khan", "khó thở"],
     "Nhóm bệnh ác tính đa dạng từ tế bào B, T. Có loại tiến triển chậm, có loại rất nhanh.",
     "R-CHOP cho DLBCL (loại phổ biến). Theo dõi nếu indolent. CAR-T cell, ghép tủy nếu tái phát."),

    ("Hemophilia A", "Huyết học", "nặng",
     ["dễ chảy máu", "máu khó đông", "bầm tím", "đau khớp", "sưng khớp", "chảy máu mũi", "tiểu máu"],
     "Thiếu yếu tố VIII di truyền liên kết X. Chảy máu khớp, cơ tự nhiên.",
     "Truyền yếu tố VIII khi chảy máu hoặc dự phòng. Tránh chấn thương, NSAID. Vaccine HBV."),

    ("Bệnh Thalassemia", "Huyết học", "nặng",
     ["da xanh tái", "vàng da", "mệt mỏi", "chậm phát triển", "lách to", "khó thở gắng sức", "biến dạng xương"],
     "Bệnh di truyền tổn thương chuỗi globin. Thalassemia thể nặng (Cooley) cần truyền máu suốt đời.",
     "Truyền máu định kỳ. Thải sắt (Deferasirox). Ghép tủy thay thế. Tư vấn tiền hôn nhân."),

    # ════════════════ THẬN TIẾT NIỆU (12) ═════════════════════════════════════
    ("Viêm cầu thận cấp", "Thận tiết niệu", "nặng",
     ["phù mặt", "phù mí mắt", "phù chân", "tiểu máu", "tiểu ít", "tăng huyết áp", "mệt mỏi", "đau lưng"],
     "Viêm cầu thận sau nhiễm liên cầu, IgA, lupus. Tam chứng: phù, tiểu máu, tăng HA.",
     "Hạn chế muối, nước, đạm. Lợi tiểu, hạ HA. Corticoid nếu lupus/IgA. Theo dõi chức năng thận."),

    ("Viêm cầu thận mạn", "Thận tiết niệu", "nặng",
     ["phù chân", "phù mặt", "tiểu ít", "tiểu máu", "mệt mỏi", "tăng huyết áp", "chán ăn", "buồn nôn"],
     "Viêm cầu thận tiến triển sang xơ hóa, suy thận mạn. Nhiều bệnh nguyên gây ra.",
     "Kiểm soát HA bằng ACEi/ARB. Hạn chế đạm, muối. Theo dõi GFR, protein niệu. Lọc máu khi suy thận giai đoạn cuối."),

    ("Suy thận cấp", "Thận tiết niệu", "nguy hiểm",
     ["tiểu ít", "bí tiểu", "phù chân", "buồn nôn", "nôn", "mệt mỏi", "lú lẫn", "khó thở"],
     "Chức năng thận giảm đột ngột. Nguyên nhân: sốc, tắc nghẽn, thuốc độc thận.",
     "Tìm nguyên nhân, ngưng thuốc gây độc. Bù dịch nếu thiếu, lợi tiểu nếu quá tải. Lọc máu nếu cần."),

    ("Suy thận mạn", "Thận tiết niệu", "nguy hiểm",
     ["mệt mỏi", "phù chân", "tiểu đêm", "ngứa da", "buồn nôn", "chán ăn", "khó thở", "tăng huyết áp"],
     "GFR <60 mL/phút >3 tháng. Tiến triển không hồi phục. Yếu tố: ĐTĐ, THA, viêm cầu thận.",
     "Kiểm soát HA, ĐTĐ. ACEi/ARB chậm tiến triển. Erythropoietin nếu thiếu máu. Lọc máu hoặc ghép thận giai đoạn V."),

    ("Sỏi thận", "Thận tiết niệu", "nặng",
     ["đau lưng", "đau hông", "tiểu máu", "buồn nôn", "nôn", "đau bẹn", "tiểu đau", "tiểu rắt"],
     "Sỏi calci oxalate, urate, struvite. Cơn đau quặn thận khi sỏi di chuyển.",
     "Uống nhiều nước >2.5L/ngày. NSAID giảm đau. Tamsulosin tống sỏi. Tán sỏi ngoài cơ thể (ESWL) nếu lớn."),

    ("Sỏi niệu quản", "Thận tiết niệu", "nặng",
     ["đau lưng", "đau hông", "đau bẹn", "tiểu máu", "buồn nôn", "nôn", "tiểu rắt", "đau quặn bụng"],
     "Sỏi mắc kẹt trong niệu quản, gây cơn đau quặn dữ dội, tiểu máu.",
     "Tamsulosin hỗ trợ tống sỏi. ESWL, nội soi tán sỏi nội niệu quản. Đặt JJ stent nếu tắc."),

    ("Sỏi bàng quang", "Thận tiết niệu", "trung bình",
     ["tiểu rắt", "tiểu buốt", "tiểu máu", "đau hạ vị", "bí tiểu", "tiểu ngắt quãng"],
     "Sỏi hình thành trong bàng quang, hay ở nam giới phì đại tiền liệt.",
     "Tán sỏi nội soi qua niệu đạo. Phẫu thuật mở nếu sỏi lớn. Điều trị nguyên nhân (tắc đường tiểu)."),

    ("Nhiễm trùng đường tiểu", "Thận tiết niệu", "trung bình",
     ["tiểu buốt", "tiểu rắt", "tiểu nhiều", "đau hạ vị", "tiểu mủ", "tiểu đục", "sốt nhẹ", "đau lưng"],
     "Nhiễm khuẩn niệu dưới (viêm bàng quang). E.coli chiếm 80%. Phụ nữ hay gặp.",
     "Kháng sinh Trimethoprim-Sulfamethoxazole, Nitrofurantoin 3-7 ngày. Uống nhiều nước. Vệ sinh đúng."),

    ("Viêm bể thận cấp", "Thận tiết niệu", "nặng",
     ["sốt cao", "ớn lạnh", "đau lưng", "đau hông", "buồn nôn", "nôn", "tiểu buốt", "tiểu rắt"],
     "Nhiễm khuẩn lan lên bể thận, có thể nhiễm khuẩn huyết. Đau lưng + sốt cao.",
     "Cấy nước tiểu. Kháng sinh IV (Ceftriaxone) ban đầu, chuyển uống khi cải thiện. 10-14 ngày."),

    ("Phì đại tuyến tiền liệt", "Thận tiết niệu", "trung bình",
     ["tiểu khó", "tiểu ngắt quãng", "tiểu đêm", "tiểu rắt", "bí tiểu", "tiểu yếu", "khó nín tiểu"],
     "Tuyến tiền liệt to lành tính ở nam >50t, gây bí tiểu, tiểu khó.",
     "Tamsulosin giãn cơ trơn. Finasteride giảm thể tích. Phẫu thuật TURP nếu nặng/biến chứng."),

    ("Ung thư thận", "Thận tiết niệu", "nguy hiểm",
     ["tiểu máu", "đau lưng", "khối u sờ thấy", "sụt cân", "sốt nhẹ", "mệt mỏi", "thiếu máu", "tăng huyết áp"],
     "Ung thư tế bào thận, thường phát hiện tình cờ qua siêu âm. Bộ ba: tiểu máu + đau lưng + khối u (hiếm).",
     "Phẫu thuật cắt thận (bán phần hoặc toàn phần). Liệu pháp đích (Sunitinib), miễn dịch nếu di căn."),

    ("Hội chứng thận hư", "Thận tiết niệu", "nặng",
     ["phù mặt", "phù chân", "phù toàn thân", "tiểu ít", "mệt mỏi", "chán ăn", "tăng cân", "tiểu đục"],
     "Protein niệu >3.5g/24h, phù toàn thân, giảm albumin máu. Nhiều bệnh nguyên.",
     "Corticoid liều cao. Lợi tiểu, ACEi giảm protein niệu. Chế độ ăn giảm muối, đủ đạm. Theo dõi sinh thiết thận."),

    # ════════════════ NHI KHOA (15) ═══════════════════════════════════════════
    ("Sốt xuất huyết trẻ em", "Nhi khoa", "nặng",
     ["sốt cao", "phát ban", "đau đầu", "đau bụng", "nôn", "chảy máu mũi", "bầm tím", "mệt mỏi"],
     "Trẻ nhiễm Dengue dễ vào sốc ngày 4-7. Quấy khóc, nôn liên tục là dấu hiệu cảnh báo.",
     "Theo dõi sát ngày 4-7. Bù dịch uống/IV. Nhập viện nếu sốc, xuất huyết. Không Aspirin, NSAID."),

    ("Tay chân miệng", "Nhi khoa", "trung bình",
     ["loét miệng", "phát ban", "mụn nước", "sốt cao", "biếng ăn", "quấy khóc", "chảy nước miếng", "đau họng"],
     "Nhiễm virus EV71, Coxsackie A. Bóng nước lòng bàn tay/chân/miệng. Biến chứng viêm não nguy hiểm.",
     "Cách ly, hạ sốt, súc miệng. Theo dõi giật mình, sốt cao liên tục → nhập viện ngay. Vệ sinh tay."),

    ("Tiêu chảy cấp trẻ em", "Nhi khoa", "trung bình",
     ["tiêu chảy nhiều lần", "nôn", "sốt nhẹ", "biếng ăn", "quấy khóc", "khô môi", "tiểu ít", "ngủ li bì"],
     "Tiêu chảy <14 ngày ở trẻ <5t. Hay do Rotavirus, vi khuẩn. Nguy cơ mất nước.",
     "Oresol bù nước theo phân loại mất nước. Tiếp tục bú/ăn. Kẽm 10-20mg/ngày 14 ngày. Vaccine Rota."),

    ("Viêm phổi trẻ em", "Nhi khoa", "nặng",
     ["sốt cao", "ho có đờm", "khó thở", "thở nhanh", "tím tái", "rút lõm ngực", "quấy khóc", "bỏ bú"],
     "Viêm phổi cộng đồng ở trẻ, hay do phế cầu, Mycoplasma, RSV. Thở nhanh là dấu hiệu sớm.",
     "Đếm nhịp thở. Amoxicillin uống nếu nhẹ. IV Ampicillin+ Gentamicin nếu nặng. Oxy nếu SpO2 <92%."),

    ("Hen ở trẻ em", "Nhi khoa", "trung bình",
     ["thở khò khè", "khó thở", "ho khan", "tức ngực", "khó thở đêm", "ngứa mũi", "phát ban"],
     "Viêm mạn đường thở, có yếu tố dị ứng (chàm, viêm mũi). Khò khè tái diễn.",
     "Salbutamol khí dung cắt cơn. ICS thấp liều kiểm soát. Tránh dị nguyên, khói thuốc. Tập thở."),

    ("Sốt phát ban trẻ em", "Nhi khoa", "nhẹ",
     ["sốt cao", "phát ban", "biếng ăn", "quấy khóc", "mệt mỏi", "hạch to"],
     "Roseola infantum (HHV-6) ở trẻ <2t. Sốt cao 3 ngày, hết sốt là phát ban hồng.",
     "Hạ sốt, uống nước. Tự khỏi. Phân biệt với sởi, rubella. Trấn an gia đình."),

    ("Viêm tai giữa trẻ em", "Nhi khoa", "trung bình",
     ["đau tai", "sốt cao", "quấy khóc", "bỏ bú", "kéo tai", "chảy mủ tai", "ngủ kém"],
     "Trẻ <2t hay bị, sau cảm. Đau tai, sốt, quấy khóc đêm.",
     "Amoxicillin 80-90mg/kg/ngày nếu <2t hoặc nặng. Theo dõi 48-72h nếu >2t. Đặt ống thông khí nếu tái diễn."),

    ("Còi xương", "Nhi khoa", "trung bình",
     ["còi xương", "chậm phát triển", "biến dạng xương", "đổ mồ hôi", "ngủ không yên", "rụng tóc gáy"],
     "Thiếu vitamin D, calcium ở trẻ, làm xương mềm. Hay gặp do thiếu ánh nắng.",
     "Vitamin D3 800-2000 UI/ngày. Calcium 500mg/ngày. Phơi nắng 15-30 phút/ngày. Bổ sung sữa."),

    ("Suy dinh dưỡng trẻ em", "Nhi khoa", "nặng",
     ["chậm phát triển", "sụt cân", "biếng ăn", "mệt mỏi", "tóc thưa", "phù toàn thân", "da xanh tái"],
     "Trẻ thấp/nhẹ cân theo tuổi. Suy dinh dưỡng thể teo, phù, hỗn hợp.",
     "Tăng cường dinh dưỡng: F75/F100 nếu nặng. Đa vi chất. Tẩy giun, vaccine đầy đủ. Tư vấn dinh dưỡng."),

    ("Vàng da sơ sinh", "Nhi khoa", "trung bình",
     ["vàng da sơ sinh", "vàng da", "ngủ li bì", "bỏ bú", "vàng mắt"],
     "Sinh lý (3-7 ngày) hoặc bệnh lý (sớm <24h, kéo dài >2 tuần). Bilirubin gián tiếp cao.",
     "Chiếu đèn nếu bilirubin cao theo biểu đồ. Thay máu nếu cực cao. Tăng bú mẹ. Tìm nguyên nhân bệnh lý."),

    ("Nhiễm trùng sơ sinh", "Nhi khoa", "nguy hiểm",
     ["sốt cao", "sốt thấp", "ngủ li bì", "bỏ bú", "thóp phồng", "vàng da", "co giật", "tím tái"],
     "Nhiễm khuẩn huyết sơ sinh <28 ngày, tử vong cao. GBS, E.coli hay gặp.",
     "Cấy máu, dịch não tủy. Kháng sinh Ampicillin + Gentamicin/Cefotaxime IV ngay. Hỗ trợ tích cực."),

    ("Co giật do sốt cao", "Nhi khoa", "trung bình",
     ["sốt cao", "co giật", "mất ý thức", "mệt mỏi", "ngủ li bì", "lú lẫn"],
     "Co giật do sốt ở trẻ 6th-5t. Đa số lành tính (đơn giản <15 phút, không khu trú).",
     "Hạ sốt tích cực. Diazepam đặt hậu môn nếu cơn dài. Tìm nguyên nhân sốt. Trấn an gia đình."),

    ("Viêm thanh quản cấp ở trẻ", "Nhi khoa", "trung bình",
     ["ho khan", "khó thở", "thở rít", "khàn giọng", "sốt nhẹ", "quấy khóc", "tím tái"],
     "Croup do virus, hay <3t. Ho khàn 'như chó sủa', tiếng thở rít đặc trưng.",
     "Adrenaline khí dung nếu nặng. Dexamethasone uống/tiêm. Hít hơi ẩm. Theo dõi suy hô hấp."),

    ("Tiêu chảy do Rota virus", "Nhi khoa", "trung bình",
     ["tiêu chảy nhiều lần", "nôn", "sốt nhẹ", "khô môi", "ngủ li bì", "biếng ăn", "quấy khóc"],
     "Rotavirus là nguyên nhân tiêu chảy nặng số 1 ở trẻ <5t. Phân tóe nước, mùi chua.",
     "Bù nước Oresol tích cực. Tiếp tục ăn uống. Kẽm. Vaccine Rota 2-3 liều trước 6 tháng tuổi."),

    ("Viêm họng do Adenovirus", "Nhi khoa", "trung bình",
     ["sốt cao", "đau họng", "viêm kết mạc", "đỏ mắt", "ho khan", "hạch to", "mệt mỏi", "biếng ăn"],
     "Sốt + viêm họng + viêm kết mạc (PCF: pharyngoconjunctival fever) hay gặp ở trẻ.",
     "Điều trị triệu chứng. Hạ sốt, nước muối nhỏ mắt. Cách ly tránh lây qua bể bơi."),

    # ════════════════ SẢN PHỤ KHOA (12) ══════════════════════════════════════
    ("Viêm âm đạo nấm", "Sản phụ khoa", "nhẹ",
     ["ngứa vùng kín", "khí hư bất thường", "nóng rát vùng kín", "đau khi quan hệ", "tiểu buốt"],
     "Nhiễm Candida albicans, khí hư đặc trắng như sữa chua. Hay sau kháng sinh, ĐTĐ.",
     "Fluconazole 150mg liều duy nhất hoặc Clotrimazole đặt 7 ngày. Vệ sinh khô, mặc thoáng. Điều trị bạn tình nếu tái phát."),

    ("Viêm cổ tử cung", "Sản phụ khoa", "trung bình",
     ["khí hư bất thường", "xuất huyết âm đạo", "đau vùng chậu", "đau khi quan hệ", "tiểu buốt", "ngứa vùng kín"],
     "Viêm cổ tử cung do Chlamydia, lậu, Trichomonas. Có thể không triệu chứng.",
     "Cấy dịch, xét nghiệm STI. Doxycycline cho Chlamydia, Ceftriaxone cho lậu. Điều trị bạn tình."),

    ("Lạc nội mạc tử cung", "Sản phụ khoa", "trung bình",
     ["đau bụng kinh", "rong kinh", "đau khi quan hệ", "vô sinh", "đau vùng chậu", "đau lưng dưới"],
     "Mô nội mạc tử cung mọc ngoài tử cung (buồng trứng, phúc mạc). Gây đau, vô sinh.",
     "NSAID giảm đau. Thuốc tránh thai dài hạn ức chế chu kỳ. GnRH analog. Phẫu thuật nội soi cắt tổn thương."),

    ("U xơ tử cung", "Sản phụ khoa", "trung bình",
     ["rong kinh", "đau bụng kinh", "đau vùng chậu", "khối u sờ thấy", "tiểu rắt", "táo bón", "vô sinh"],
     "U cơ trơn lành tính ở tử cung, phụ nữ 30-50t. Có thể không triệu chứng.",
     "Theo dõi nếu không triệu chứng. Thuốc tránh thai/GnRH giảm kinh. Phẫu thuật bóc u/cắt tử cung."),

    ("U nang buồng trứng", "Sản phụ khoa", "trung bình",
     ["đau vùng chậu", "đau bụng kinh", "rong kinh", "khối u sờ thấy", "tiểu rắt", "buồn nôn", "đầy bụng"],
     "Nang chứa dịch ở buồng trứng. Phần lớn lành tính (cơ năng, dermoid). Có thể xoắn cấp.",
     "Theo dõi nang <5cm, đơn giản. Phẫu thuật nội soi nếu lớn, phức tạp, nghi ác. Cấp cứu nếu xoắn."),

    ("Buồng trứng đa nang", "Sản phụ khoa", "trung bình",
     ["mất kinh", "rong kinh", "lông tóc rậm", "tăng cân", "vô sinh", "mụn trứng cá", "rụng tóc"],
     "Hội chứng rối loạn nội tiết - chuyển hóa: mất kinh, cường androgen, đa nang. Liên quan kháng insulin.",
     "Thay đổi lối sống, giảm cân. Metformin. Thuốc tránh thai phối hợp. Clomiphene/Letrozole gây phóng noãn."),

    ("Ung thư cổ tử cung", "Sản phụ khoa", "nguy hiểm",
     ["xuất huyết âm đạo", "khí hư bất thường", "đau khi quan hệ", "đau vùng chậu", "sụt cân", "mệt mỏi", "đau lưng"],
     "Ung thư cổ tử cung do HPV 16, 18 chủ yếu. Tầm soát Pap smear + HPV giảm tử vong.",
     "Phẫu thuật + xạ trị + hóa trị tùy giai đoạn. Vaccine HPV phòng ngừa cho cô gái 9-26t. Tầm soát định kỳ."),

    ("Rong kinh", "Sản phụ khoa", "trung bình",
     ["rong kinh", "đau bụng kinh", "mệt mỏi", "da xanh tái", "chóng mặt", "đau lưng dưới"],
     "Kinh nguyệt >7 ngày hoặc lượng nhiều >80ml. Nguyên nhân: u xơ, polyp, rối loạn nội tiết.",
     "Tìm nguyên nhân (siêu âm, nội soi). NSAID, tranexamic acid khi kinh. Thuốc tránh thai phối hợp. Phẫu thuật nếu cần."),

    ("Vô sinh nữ", "Sản phụ khoa", "trung bình",
     ["mất kinh", "rong kinh", "đau bụng kinh", "đau khi quan hệ", "khí hư bất thường", "lông tóc rậm"],
     "Không có thai sau 12 tháng quan hệ không tránh thai. Nguyên nhân: rụng trứng, tắc vòi, lạc nội mạc.",
     "Tầm soát rụng trứng, chụp HSG, siêu âm. Letrozole/Clomiphene gây phóng noãn. IVF nếu cần."),

    ("Tiền sản giật", "Sản phụ khoa", "nguy hiểm",
     ["tăng huyết áp", "phù mặt", "phù chân", "đau đầu dữ dội", "mờ mắt", "đau hạ sườn phải", "buồn nôn", "phù toàn thân"],
     "HA cao + protein niệu sau tuần 20 thai kỳ. Có thể chuyển sản giật (co giật) đe dọa tính mạng.",
     "Kiểm soát HA (Labetalol, Methyldopa). Magie sulfat phòng co giật. Sinh sớm nếu nặng. Theo dõi sát."),

    ("Doạ sảy thai", "Sản phụ khoa", "trung bình",
     ["xuất huyết âm đạo", "đau bụng dưới", "đau lưng dưới", "đau quặn bụng"],
     "Chảy máu/đau bụng <20 tuần thai, cổ tử cung đóng. Có thể tiến triển sảy hoặc tự khỏi.",
     "Nghỉ ngơi, kiêng quan hệ. Progesterone nếu tiền sử sảy. Siêu âm theo dõi tim thai."),

    ("Mãn kinh", "Sản phụ khoa", "nhẹ",
     ["mất kinh", "nóng bừng", "vã mồ hôi", "khô âm đạo", "mất ngủ", "thay đổi tâm trạng", "đau khi quan hệ"],
     "Hết kinh nguyệt 12 tháng liên tiếp, tuổi trung bình 50. Suy giảm estrogen.",
     "Thay đổi lối sống. Liệu pháp hormone nếu triệu chứng nặng. Calcium, vitamin D phòng loãng xương."),

    # ════════════════ UNG BƯỚU (5) + TÂM THẦN (2) + RĂNG HÀM MẶT (2) (9) ═════
    ("Ung thư vú", "Ung bướu", "nguy hiểm",
     ["khối u sờ thấy", "thay đổi vú", "tiết dịch núm vú", "sưng hạch cổ", "đau ngực", "sụt cân", "mệt mỏi"],
     "Ung thư vú phổ biến nhất ở phụ nữ. Tầm soát chụp nhũ ảnh hàng năm sau 40t.",
     "Phẫu thuật bảo tồn hoặc cắt vú. Xạ trị, hóa trị, liệu pháp đích (Herceptin nếu HER2+), nội tiết (Tamoxifen nếu ER+)."),

    ("Ung thư đại tràng", "Ung bướu", "nguy hiểm",
     ["phân có máu", "tiêu chảy", "táo bón", "đau bụng", "sụt cân", "mệt mỏi", "thiếu máu", "khối u sờ thấy"],
     "Ung thư đại trực tràng. Tầm soát nội soi đại tràng 10 năm/lần sau 50t, sớm hơn nếu tiền sử gia đình.",
     "Phẫu thuật cắt đại tràng + nạo hạch. Hóa trị FOLFOX/FOLFIRI. Liệu pháp đích (Bevacizumab, Cetuximab)."),

    ("Ung thư dạ dày", "Ung bướu", "nguy hiểm",
     ["đau thượng vị", "buồn nôn", "nôn", "sụt cân", "chán ăn", "nôn ra máu", "phân đen", "mệt mỏi"],
     "Ung thư dạ dày, liên quan H.pylori, ăn mặn, hun khói. Tỷ lệ tử vong cao.",
     "Phẫu thuật cắt dạ dày + nạo hạch. Hóa trị 5-FU/Capecitabine + Platin. Trastuzumab nếu HER2+."),

    ("Ung thư tuyến giáp", "Ung bướu", "nặng",
     ["bướu cổ", "khối u sờ thấy", "khàn giọng", "khó nuốt", "sưng hạch cổ", "khó thở"],
     "Ung thư tuyến giáp, đa số biệt hóa tốt (papillary, follicular), tiên lượng tốt.",
     "Phẫu thuật cắt giáp toàn bộ + nạo hạch. I-131 sau mổ. Levothyroxine ức chế TSH. Theo dõi Tg."),

    ("Ung thư phổi", "Ung bướu", "nguy hiểm",
     ["ho có đờm", "ho ra máu", "khó thở", "đau ngực", "sụt cân", "mệt mỏi", "khàn giọng", "sốt nhẹ"],
     "Ung thư phổi không tế bào nhỏ (NSCLC 85%) hoặc tế bào nhỏ (SCLC 15%). Hút thuốc là yếu tố chính.",
     "Phẫu thuật nếu khu trú. Hóa-xạ trị. Liệu pháp đích (EGFR, ALK). Miễn dịch (Pembrolizumab). BỎ THUỐC."),

    ("Trầm cảm", "Tâm thần", "nặng",
     ["trầm cảm", "buồn rầu", "mất ngủ", "chán ăn", "mệt mỏi", "mất tập trung", "ý nghĩ tự sát", "thay đổi tâm trạng"],
     "Rối loạn khí sắc buồn kéo dài >2 tuần, mất hứng thú, ảnh hưởng chức năng. Nguy cơ tự sát.",
     "Tâm lý trị liệu (CBT). SSRI (Sertraline, Escitalopram) là thuốc đầu tay. Khẩn cấp nếu có ý tự sát."),

    ("Rối loạn lo âu", "Tâm thần", "trung bình",
     ["lo âu", "cơn hoảng loạn", "hồi hộp", "vã mồ hôi", "khó thở", "mất ngủ", "mất tập trung", "thay đổi tâm trạng"],
     "Lo âu lan tỏa hoặc rối loạn hoảng sợ kéo dài. Triệu chứng cơ thể đi kèm.",
     "CBT, kỹ thuật thư giãn, thiền. SSRI hoặc SNRI. Benzodiazepine ngắn hạn khi cần. Hạn chế caffeine."),

    ("Sâu răng", "Răng hàm mặt", "nhẹ",
     ["đau răng", "sâu răng", "nhạy cảm răng", "đau khi nhai", "hôi miệng"],
     "Mất khoáng men răng do acid vi khuẩn. Lỗ sâu phát triển vào ngà, tủy gây đau.",
     "Vệ sinh răng miệng, fluoride. Trám composite nếu sâu chưa tới tủy. Lấy tủy nếu sâu đến tủy."),

    ("Viêm tủy răng", "Răng hàm mặt", "trung bình",
     ["đau răng", "đau giữa đêm", "nhạy cảm răng", "sưng nướu", "hôi miệng", "đau hàm"],
     "Viêm tủy răng do sâu sâu, chấn thương. Đau tự phát, đau khi gặp nóng/lạnh, kéo dài.",
     "Lấy tủy điều trị nội nha. Trám tạm rồi trám vĩnh viễn. Bọc răng sứ nếu yếu. Nhổ nếu không cứu được."),
]

assert len(DISEASES) == 200, f"Cần đủ 200 bệnh, hiện có {len(DISEASES)}"


def disease_dict():
    """Trả về dict {name: full_record} để tra cứu."""
    return {d[0]: {"department": d[1], "severity": d[2], "symptoms": d[3],
                   "explanation": d[4], "treatment": d[5]} for d in DISEASES}


if __name__ == '__main__':
    print(f"Tổng số bệnh: {len(DISEASES)}")
    depts = {}
    for d in DISEASES:
        depts.setdefault(d[1], 0)
        depts[d[1]] += 1
    print("Phân bố theo khoa:")
    for dept, count in sorted(depts.items(), key=lambda x: -x[1]):
        print(f"  {dept}: {count} bệnh")

    # Kiểm tra triệu chứng có trong vocabulary
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from symptoms_data import ALL_SYMPTOMS
    vocab = set(ALL_SYMPTOMS)
    unknown = set()
    for d in DISEASES:
        for s in d[3]:
            if s not in vocab:
                unknown.add(s)
    if unknown:
        print(f"\n⚠ Có {len(unknown)} triệu chứng KHÔNG có trong vocabulary:")
        for s in sorted(unknown):
            print(f"  - {s}")
    else:
        print("\n✓ Tất cả triệu chứng đều có trong vocabulary 300 từ.")
