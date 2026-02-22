import { Html, Head, Body, Container, Text, Link, Preview, Section, Hr, Img } from '@react-email/components';
import * as React from 'react';

interface BetResolvedEmailProps {
    userName: string;
    marketTitle: string;
    outcome: string; // "WON" or "LOST"
    amountBetted: number;
    payout: number;
}

export const BetResolvedEmail = ({
    userName,
    marketTitle,
    outcome,
    amountBetted,
    payout
}: BetResolvedEmailProps) => {
    const isWin = outcome === 'WON';
    const previewText = isWin
        ? `Você ganhou R$ ${payout.toFixed(2)} no mercado ${marketTitle}!`
        : `O mercado ${marketTitle} foi finalizado. Veja o resultado das suas previsões.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo Example */}
                    <div style={{ padding: '20px 0', textAlign: 'center' }}>
                        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                            <span style={{ color: '#04B305' }}>/</span>Predity
                        </Text>
                    </div>

                    <Section style={content}>
                        <Text style={greeting}>Olá, {userName}!</Text>

                        {isWin ? (
                            <>
                                <Text style={text}>
                                    Temos uma ótima notícia! O mercado <strong>"{marketTitle}"</strong> foi resolvido e a sua previsão estava <strong>correta</strong>! 🎉
                                </Text>
                                <div style={highlightBoxWin}>
                                    <Text style={highlightText}>Você ganhou</Text>
                                    <Text style={highlightValue}>R$ {payout.toFixed(2)}</Text>
                                </div>
                                <Text style={text}>
                                    O valor já está creditado na sua carteira da Predity e pronto para ser sacado via PIX ou usado em novas apostas.
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={text}>
                                    O mercado <strong>"{marketTitle}"</strong> foi resolvido, mas infelizmente a sua previsão não se confirmou desta vez.
                                </Text>
                                <div style={highlightBoxLoss}>
                                    <Text style={highlightText}>Valor da Aposta</Text>
                                    <Text style={highlightValue}>- R$ {amountBetted.toFixed(2)}</Text>
                                </div>
                                <Text style={text}>
                                    Não desanime! Há dezenas de novos mercados abertos e com excelentes oportunidades aguardando por você.
                                </Text>
                            </>
                        )}

                        <Section style={btnContainer}>
                            <Link href="https://app.preditybr.com/app/markets" style={button}>
                                Ver Novos Mercados
                            </Link>
                        </Section>

                        <Hr style={hr} />

                        <Text style={footer}>
                            PredityBR © 2026<br />
                            A plataforma de predições que paga no PIX.<br />
                            Você recebeu este e-mail porque tem uma conta ativa no app.preditybr.com
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#0f1115',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '560px',
};

const content = {
    backgroundColor: '#151921',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #1f2937',
};

const greeting = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '16px',
};

const text = {
    fontSize: '16px',
    color: '#9ca3af',
    lineHeight: '24px',
};

const highlightBoxWin = {
    backgroundColor: 'rgba(4, 179, 5, 0.1)',
    border: '1px solid rgba(4, 179, 5, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

const highlightBoxLoss = {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

const highlightText = {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0 0 8px 0',
};

const highlightValue = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 0,
};

const btnContainer = {
    textAlign: 'center' as const,
    margin: '32px 0 24px',
};

const button = {
    backgroundColor: '#04B305',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
};

const hr = {
    borderColor: '#374151',
    margin: '20px 0',
};

const footer = {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '18px',
    textAlign: 'center' as const,
};

export default BetResolvedEmail;
