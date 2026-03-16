import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Text,
} from "@react-email/components";

interface PasswordResetProps {
	url: string;
}

export function PasswordReset({ url }: PasswordResetProps) {
	return (
		<Html>
			<Head />
			<Preview>Reset your password</Preview>
			<Body style={{ fontFamily: "sans-serif", padding: "20px" }}>
				<Container>
					<Heading>Reset your password</Heading>
					<Text>Click the link below to reset your password:</Text>
					<Link href={url}>Reset Password</Link>
				</Container>
			</Body>
		</Html>
	);
}
