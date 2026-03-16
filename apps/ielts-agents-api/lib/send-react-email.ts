import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST ?? "localhost",
	port: Number(process.env.EMAIL_PORT ?? "587"),
	secure: process.env.EMAIL_SECURE === "true",
	auth: {
		user: process.env.EMAIL_USER ?? "",
		pass: process.env.EMAIL_PASS ?? "",
	},
});

interface SendReactEmailOptions {
	subject: string;
	element: ReactElement;
	to: string;
}

export async function sendReactEmail({
	subject,
	element,
	to,
}: SendReactEmailOptions) {
	const html = await render(element);
	await transporter.sendMail({
		from: process.env.EMAIL_FROM ?? "noreply@ielts-agents.com",
		to,
		subject,
		html,
	});
}
