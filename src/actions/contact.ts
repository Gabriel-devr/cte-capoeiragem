"use server";

export async function submitContactForm(formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  console.log("Mocking contact submission:", { name, email, message });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return { success: true, message: "Mensagem enviada com sucesso!" };
}
