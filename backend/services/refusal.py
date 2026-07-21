"""
Ungrounded-query guard.

This is the point of a *legal* RAG system, so it is enforced in code rather than
requested in a prompt.

The system prompt used to carry the whole burden:

    ## STRICT RULE - VERY IMPORTANT
    You MUST respond with exactly this: "I don't have specific information..."
    DO NOT answer from general knowledge.
    DO NOT make up section numbers or cases.

That is a request, not a guarantee. Instruction-following is probabilistic, and
a leading follow-up ("but surely 302 covers this?") can walk a model straight
past it — especially a fast, small, cheap one. The failure mode is the worst this
product has: a confidently invented section number, written in the register of
legal advice, given to someone who cannot tell the difference and may act on it.

So when retrieval returns nothing, the LLM is never called. There is no prompt to
jailbreak, no sampling to get unlucky with, and no token spend. The response is
deterministic.

The wording matters too. "I don't have information about this" invites the reader
to conclude the law is silent. It isn't — the *corpus* is silent, which is a fact
about this software, not about Pakistan. The message says so.
"""

REFUSAL = {
    "en": (
        "I couldn't find anything about this in the Pakistani law corpus I have.\n\n"
        "That means one of two things: the topic may not be covered by the statutes "
        "I hold, or the question may be worded in a way I couldn't match. It does "
        "**not** mean Pakistani law is silent on it.\n\n"
        "I won't guess at a section number — a wrong citation is worse than none at "
        "all. Please consult a qualified Pakistani lawyer, or try rephrasing with "
        "the legal term if you know it."
    ),
    "ur": (
        "مجھے اپنے پاکستانی قانون کے ذخیرے میں اس بارے میں کچھ نہیں ملا۔\n\n"
        "اس کا مطلب دو میں سے ایک ہے: یا تو یہ موضوع میرے پاس موجود قوانین میں شامل "
        "نہیں، یا سوال کے الفاظ سے مماثلت نہیں ہو سکی۔ اس کا یہ مطلب **نہیں** کہ "
        "پاکستانی قانون اس پر خاموش ہے۔\n\n"
        "میں دفعہ کا نمبر اندازے سے نہیں بتاؤں گا — غلط حوالہ، حوالہ نہ ہونے سے بدتر "
        "ہے۔ براہِ کرم کسی مستند پاکستانی وکیل سے رجوع کریں، یا اگر قانونی اصطلاح "
        "معلوم ہو تو سوال دوبارہ اُس لفظ کے ساتھ پوچھیں۔"
    ),
    "roman": (
        "Mujhe apne Pakistani law corpus mein is baare mein kuch nahi mila.\n\n"
        "Iska matlab do mein se ek hai: ya to ye topic mere paas mojood qawaneen mein "
        "shaamil nahi, ya sawaal ke alfaaz se match nahi ho saka. Iska matlab ye "
        "**nahi** ke Pakistani law is par khamosh hai.\n\n"
        "Main section ka number andaaze se nahi bataunga -- ghalat citation, koi "
        "citation na hone se bhi bad-tar hai. Baraye meharbani kisi qualified "
        "Pakistani wakeel se rujoo karein, ya agar legal term maloom ho to sawaal "
        "dobara us lafz ke saath poochein."
    ),
}


def refusal_for(language: str) -> str:
    """Deterministic refusal text. Never reaches the LLM."""
    return REFUSAL.get(language, REFUSAL["en"])
