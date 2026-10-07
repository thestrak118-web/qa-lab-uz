/** Suggest a next action without changing the learner's recorded results. */
export function nextPracticeStep(session) {
  const { checklist, cases, reports } = session;
  const tests = [...cases, ...checklist];

  if (!tests.length) {
    return {
      title: "Bitta talabdan boshlang",
      description:
        "Talabni o‘qing va shu talab kartasidagi “Checklist yozish” tugmasini bosing.",
      target: "requirements",
      action: "Talabni tanlash",
    };
  }
  if (!cases.length) {
    return {
      title: "Tekshiruvga aniq qadamlar yozing",
      description:
        "Test-case’da boshlang‘ich shart, qadamlar va kutilgan natijani kiriting.",
      target: "cases",
      action: "Test-case’larni ochish",
    };
  }
  if (tests.some((item) => item.status === "Failed") && !reports.length) {
    return {
      title: "Aniqlangan xatoga report yozing",
      description:
        "Xatoni qayta bajaring. Qadamlar, kutilgan va haqiqiy natijani alohida yozing.",
      target: "reports",
      action: "Bug-report’larni ochish",
    };
  }
  if (tests.some((item) => item.status === "Not run")) {
    return {
      title: "Yozgan testingizni amalda bajaring",
      description:
        "Do‘konda qadamlarni takrorlang, keyin checklist yoki test-case holatini belgilang: O‘tdi, Xato bor yoki To‘siq bor.",
      target: "shop",
      action: "Do‘konda tekshirish",
    };
  }
  if (tests.some((item) => item.status === "Blocked")) {
    const blockedCases = cases.some((item) => item.status === "Blocked");
    return {
      title: "To‘siqli testlarni ko‘rib chiqing",
      description:
        "Tekshirishga nima to‘sqinlik qilganini yozing. Sharoit tayyor bo‘lsa, testni qayta bajaring.",
      target: blockedCases ? "cases" : "checklist",
      action: blockedCases ? "Test-case’larni ochish" : "Checklist’ni ochish",
    };
  }
  return {
    title: "Natijani tekshiring va xulosa yozing",
    description:
      "Mustaqil tekshiruv tugagach javoblarni solishtiring, tuzatilgan build’da retest bajaring.",
    target: "review",
    action: "Natija va retest",
  };
}
