import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import * as React from 'react';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import type { Button } from './button';
import { buttonVariants } from './button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
    const locale = useLocale();
    return (
        <nav
            role="navigation"
            aria-label={{ de: 'Seitennummerierung', en: 'pagination' }[locale]}
            data-slot="pagination"
            className={cn('mx-auto flex w-full justify-center', className)}
            {...props}
        />
    );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
    return <ul data-slot="pagination-content" className={cn('flex flex-row items-center gap-1', className)} {...props} />;
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
    return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
    isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
    React.ComponentProps<'a'>;

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
    return (
        <a
            aria-current={isActive ? 'page' : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            className={cn(
                buttonVariants({
                    variant: isActive ? 'outline' : 'ghost',
                    size,
                }),
                className,
            )}
            {...props}
        />
    );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    const locale = useLocale();
    return (
        <PaginationLink
            aria-label={{ de: 'Zur vorherigen Seite', en: 'Go to previous page' }[locale]}
            size="default"
            className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
            {...props}
        >
            <ChevronLeftIcon />
            <span className="hidden sm:block">{{ de: 'Zurück', en: 'Previous' }[locale]}</span>
        </PaginationLink>
    );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
    const locale = useLocale();
    return (
        <PaginationLink
            aria-label={{ de: 'Zur nächsten Seite', en: 'Go to next page' }[locale]}
            size="default"
            className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
            {...props}
        >
            <span className="hidden sm:block">{{ de: 'Weiter', en: 'Next' }[locale]}</span>
            <ChevronRightIcon />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
    const locale = useLocale();
    return (
        <span aria-hidden data-slot="pagination-ellipsis" className={cn('flex size-9 items-center justify-center', className)} {...props}>
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">{{ de: 'Weitere Seiten', en: 'More pages' }[locale]}</span>
        </span>
    );
}

export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
