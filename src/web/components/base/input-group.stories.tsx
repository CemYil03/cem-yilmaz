import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRightIcon, EuroIcon, MailIcon, SearchIcon, SendIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from './input-group';
import { Kbd } from './kbd';

// `input-group` is the layout primitive `MessageComposer` is built on. The
// composer leans hard on the `block-start` (attachment row) and `block-end`
// (Send button + addonStart) variants; this overview pins the four
// alignments side by side so future composers can pick the right shape
// without reading the cva config.

const meta = {
    title: 'Base/InputGroup',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="grid gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {children}
        </section>
    );
}

export const Overview: Story = {
    render: () => (
        <div className="mx-auto grid max-w-2xl gap-8 p-6">
            <Section title="Inline addons (default alignment)">
                <InputGroup>
                    <InputGroupAddon align="inline-start">
                        <SearchIcon />
                    </InputGroupAddon>
                    <InputGroupInput placeholder="Search…" />
                </InputGroup>

                <InputGroup>
                    <InputGroupInput placeholder="user@example.com" />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton variant="default" size="xs">
                            Sign up
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupAddon align="inline-start">
                        <EuroIcon />
                    </InputGroupAddon>
                    <InputGroupInput placeholder="0.00" />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>EUR</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Section>

            <Section title="Block addons (textarea composer shape)">
                <InputGroup>
                    <InputGroupTextarea placeholder="Type a message…" rows={2} />
                    <InputGroupAddon align="block-end">
                        <InputGroupText>Press</InputGroupText>
                        <Kbd>Enter</Kbd>
                        <InputGroupText>to send</InputGroupText>
                        <InputGroupButton variant="default" size="icon-xs" className="ml-auto" aria-label="Send">
                            <SendIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupAddon align="block-start">
                        <InputGroupText>To:</InputGroupText>
                        <InputGroupText className="text-foreground">ada@example.com, grace@example.com</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupTextarea placeholder="Write your message…" rows={3} />
                    <InputGroupAddon align="block-end">
                        <InputGroupButton variant="ghost" size="xs">
                            <MailIcon /> Attach
                        </InputGroupButton>
                        <InputGroupButton variant="default" size="xs" className="ml-auto">
                            Send <ArrowRightIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </Section>

            <Section title="With buttons in inline addons (negative-margin trick)">
                <InputGroup>
                    <InputGroupAddon align="inline-start">
                        <InputGroupButton variant="ghost" size="xs">
                            <SearchIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                    <InputGroupInput placeholder="Search across the docs…" />
                    <InputGroupAddon align="inline-end">
                        <Kbd>⌘K</Kbd>
                    </InputGroupAddon>
                </InputGroup>
            </Section>

            <Section title="Error state — drives the destructive ring via aria-invalid">
                <InputGroup>
                    <InputGroupInput placeholder="email" aria-invalid />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText className="text-destructive">Required</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Section>
        </div>
    ),
};
