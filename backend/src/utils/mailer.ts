import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || '103.163.138.10',
    port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
    secure: process.env.MAIL_PORT === '465' ? true : false,
    requireTLS: true,
    auth: {
        user: process.env.MAIL_USERNAME || 'admin@sift-uc.id',
        pass: process.env.MAIL_PASSWORD || 'sift-2025'
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'Leaderboard SIFT UC'}" <${process.env.MAIL_FROM_ADDRESS || 'admin@sift-uc.id'}>`,
            to,
            subject,
            html,
        });
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};
