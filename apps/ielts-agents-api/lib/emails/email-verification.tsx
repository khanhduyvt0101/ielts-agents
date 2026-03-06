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

interface EmailVerificationProps {
  url: string;
}

export function EmailVerification({ url }: EmailVerificationProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Body style={{ fontFamily: "sans-serif", padding: "20px" }}>
        <Container>
          <Heading>Verify your email</Heading>
          <Text>Click the link below to verify your email address:</Text>
          <Link href={url}>Verify Email</Link>
        </Container>
      </Body>
    </Html>
  );
}
