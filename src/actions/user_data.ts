"use server"

import { createClientServer, supabaseAdm } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function resetPasswordForEmail(email: string) {
    try {
        const supabaseServer = await createClientServer();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/reset-password`,
        });
        if (error) return { result: "erro", details: error.message };
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function loginUser(email: string, password: string) {
    try {
        const supabaseServer = await createClientServer();
        const { error } = await supabaseServer.auth.signInWithPassword({ email, password });
        if (error) return { result: "erro", details: "Email ou senha incorretos." };
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: "Erro interno do servidor." };
    }
}

export async function updatePassword(newPassword: string) {
    try {
        const supabaseServer = await createClientServer();
        const { error } = await supabaseServer.auth.updateUser({ password: newPassword });
        if (error) return { result: "erro", details: error.message };
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function createUser(full_name: string, birth_date: string, email: string, password: string) {
    try {
        const supabaseServer = await createClientServer();

        // Apenas cria o usuário auth e armazena os dados básicos nos metadados.
        // O profile e o student são criados na primeira vez que o usuário fizer login
        // (após confirmar o email), via ensureUserSetup, para evitar FK violation.
        const { data: authData, error: authError } = await supabaseServer.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    birth_date,   // guardado nos metadados para uso posterior
                }
            }
        });

        if (authError) return { result: "erro", details: authError.message };
        if (!authData.user) return { result: "erro", details: "Erro ao criar usuário." };

        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

/**
 * Chamada pelo AuthContext no primeiro login (evento SIGNED_IN).
 * Cria idempotentemente o profile, student e student_health do usuário.
 * Só executa os inserts se os registros ainda não existirem.
 */
export async function ensureUserSetup(
    userId: string,
    fullName: string,
    birthDate: string | null,
    email: string
) {
    try {
        // Verifica se o profile já existe
        const { data: existingProfile } = await supabaseAdm
            .from('profile')
            .select('profile_id')
            .eq('profile_id', userId)
            .maybeSingle();

        if (!existingProfile) {
            await supabaseAdm.from('profile').insert({
                profile_id: userId,
                full_name: fullName,
                birth_date: birthDate || null,
            });
        }

        // Verifica se o student já existe
        const { data: existingStudent } = await supabaseAdm
            .from('student')
            .select('student_id')
            .eq('profile_id', userId)
            .maybeSingle();

        if (!existingStudent) {
            // Tenta buscar um aluno existente pelo email (criado manualmente pelo admin)
            const { data: studentByEmail } = await supabaseAdm
                .from('student')
                .select('student_id')
                .ilike('email', email)
                .is('profile_id', null)
                .limit(1)
                .maybeSingle();

            if (studentByEmail) {
                // Se existe e não tem profile vinculado, atualiza vinculando
                await supabaseAdm
                    .from('student')
                    .update({ profile_id: userId })
                    .eq('student_id', studentByEmail.student_id);
            } else {
                // Se não existe, cria um novo
                const { data: newStudent, error: studentError } = await supabaseAdm
                    .from('student')
                .insert({
                    profile_id: userId,
                    full_name: fullName,
                    birth_date: birthDate || null,
                    email: email,
                })
                .select('student_id')
                .single();

            if (studentError) {
                console.error('Erro ao criar aluno:', studentError);
            } else if (newStudent) {
                // Cria student_health padrão (obrigatório pela FK)
                await supabaseAdm.from('student_health').insert({
                    student_id: newStudent.student_id,
                    has_special_needs: false,
                    has_disease: false,
                    medication_allergy: false,
                    food_allergy: false,
                    continuous_medication: false,
                    psychological_disorder: false,
                    medical_treatment: false,
                });
            }
        }
        }

        return { result: 'sucesso' };
    } catch (err: any) {
        console.error('Erro em ensureUserSetup:', err);
        return { result: 'erro', details: err.message };
    }
}

export async function listUsers() {
    try {
        const supabaseServer = await createClientServer();
        const { data: profile, error } = await supabaseServer.from('profile').select('*');

        if (error) return { result: "erro", details: error.message };
        return { result: "sucesso", profile };
    } catch (err) {
        return { result: "erro" };
    }
}

export async function getUser() {
    try {
        const supabaseServer = await createClientServer();
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
        if (authError || !user) return { result: "erro", details: "Usuário não autenticado." };

        const { data: profile, error: profileError } = await supabaseServer
            .from('profile')
            .select('profile_id, full_name, birth_date, role')
            .eq('profile_id', user.id)
            .single();

        if (profileError) return { result: "erro", details: profileError.message };
        return { result: "sucesso", profile };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function updateUser(profileData: any) {
    try {
        const supabaseServer = await createClientServer();
        const { data: { user } } = await supabaseServer.auth.getUser();
        if (!user) return { result: "erro", details: "Usuário não autenticado." };

        const { error } = await supabaseServer
            .from('profile')
            .update(profileData)
            .eq('profile_id', user.id);

        if (error) return { result: "erro", details: error.message };

        revalidatePath('/dashboard/account');
        return { result: "sucesso" };
    } catch (err: any) {
        return { result: "erro", details: err.message };
    }
}

export async function deleteUser(id: string) {
    try {
        const { error } = await supabaseAdm.auth.admin.deleteUser(id);
        if (error) return { result: "erro", details: error.message };
        revalidatePath('/dashboard');
        return { result: "sucesso" };
    } catch (err) {
        return { result: "erro" };
    }
}