import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
  contact: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email('Email invalide'),
      'phone-number': z.string().min(1, 'Le numéro de téléphone est obligatoire'),
      message: z.string().min(10, 'Veuillez détailler votre demande (minimum 10 caractères)'),
      'agree-to-policies': z.string().optional(),
      // Champs anti-spam
      website: z.string().optional(), // Honeypot
      'cf-turnstile-response': z.string().min(1, 'Vérification de sécurité requise'),
      'form-timestamp': z.string(),
    }),
    handler: async (input, context) => {
      console.log('🚀 Action appelée avec:', input);
      
      // === VALIDATIONS ANTI-SPAM ===
      
      // 1. Honeypot - Si le champ "website" est rempli, c'est un bot
      if (input.website && input.website.trim() !== '') {
        console.log('🕷️ Bot détecté via honeypot:', input.website);
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Soumission invalide détectée',
        });
      }
      
      // 2. Validation temporelle - Formulaire soumis trop rapidement
      const formTimestamp = parseInt(input['form-timestamp']);
      const currentTime = Date.now();
      const timeDiff = currentTime - formTimestamp;
      
      // Minimum 3 secondes pour remplir le formulaire
      if (timeDiff < 3000) {
        console.log('⚡ Soumission trop rapide détectée:', timeDiff + 'ms');
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Veuillez prendre le temps de remplir le formulaire',
        });
      }
      
      // 3. Validation Cloudflare Turnstile
      // Accès correct aux variables d'env sur Cloudflare Workers/Pages
      const turnstileSecret = context.locals?.runtime?.env?.TURNSTILE_SECRET_KEY;
      
      if (!turnstileSecret) {
        console.log('⚠️ Clé secrète Turnstile manquante - Variables d\'env Cloudflare non configurées');
        console.log('🔍 Vérifiez Cloudflare Pages > Settings > Environment Variables');
        console.log('🔍 TURNSTILE_SECRET_KEY doit être définie');
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Configuration de sécurité manquante - contactez l\'administrateur',
        });
      }
      
      // Vérification Turnstile avec Cloudflare
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: input['cf-turnstile-response'],
          // remoteip: context.clientAddress, // Optionnel
        }),
      });
      
      const turnstileResult = await turnstileResponse.json();
      
      if (!turnstileResult.success) {
        console.log('🛡️ Échec validation Turnstile:', turnstileResult);
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Vérification de sécurité échouée, veuillez réessayer',
        });
      }
      
      console.log('✅ Toutes les validations anti-spam réussies');
      
      // === TRAITEMENT EMAIL ===
      
      // Accès correct aux variables d'env sur Cloudflare Workers/Pages
      const resendApiKey = context.locals?.runtime?.env?.RESEND_API_KEY;
      
      console.log('🔍 Vérification clé API Resend:', !!resendApiKey);
      
      try {
        // Vérification stricte de la clé API
        if (!resendApiKey || resendApiKey.trim() === '') {
          console.log('⚠️ Aucune clé API Resend trouvée');
          
          throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Configuration email manquante - contactez l\'administrateur',
          });
        }
        
        // Vérification du format de la clé API Resend
        if (!resendApiKey.startsWith('re_')) {
          console.error('❌ Format de clé API Resend invalide');
          throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Configuration email incorrecte - contactez l\'administrateur',
          });
        }

        console.log('📧 Envoi avec Resend...');
        
        // Dynamic import pour compatibilité Cloudflare Workers
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        
        const emailResult = await resend.emails.send({
          from: 'Fullstage <contact@notifications.fullstage.fr>',
          to: ['entreprise.ju12@gmail.com'],
          replyTo: input.email,
          subject: `Nouvelle demande de contact `,
          html: `
            <h2>Nouveau message de contact </h2>
            <p><strong>Email :</strong> ${input.email}</p>
            <p><strong>Téléphone :</strong> ${input['phone-number']}</p>
            <p><strong>Message :</strong></p>
            <p>${input.message.replace(/\n/g, '<br>')}</p>
          `,
          text: `
            Nouveau message de contact 
            
            Email: ${input.email}
            Téléphone: ${input['phone-number']}
            
            Message:
            ${input.message}
          `
        });

        console.log('📧 Résultat Resend:', emailResult);

        if (emailResult.error) {
          console.error('❌ Erreur Resend:', emailResult.error);
          throw new ActionError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erreur lors de l\'envoi de l\'email: ' + emailResult.error.message,
          });
        }

        console.log('✅ Email envoyé avec succès, ID:', emailResult.data?.id);
        
        return {
          success: true,
          message: 'Votre message a été envoyé avec succès !',
          redirect: '/remerciement'
        };
        
      } catch (error) {
        console.error('❌ Erreur dans l\'action:', error);
        
        if (error instanceof ActionError) {
          throw error;
        }
        
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Une erreur inattendue s\'est produite lors de l\'envoi',
        });
      }
    },
  }),
};