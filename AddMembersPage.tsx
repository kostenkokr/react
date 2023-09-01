import { useLocation, useRouter } from '@happysanta/router';
import {
    FixedLayout,
    Panel,
    PanelHeader,
    PanelHeaderBack,
    PanelHeaderContent,
    Search,
} from '@vkontakte/vkui';
import type { FC } from 'react';
import React, { createRef, useLayoutEffect, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import InfiniteScroll from 'react-infinite-scroll-component';

import { PanelHeaderSkeleton } from '@/components/PanelHeaderCentered';
import { PAGE_LIST_MEMBERS, PANEL_ADD_MEMBERS } from '@/app/router';
import {
    useGetTesteesQuery,
    useGetTaskIdQuery,
    useGetTaskResultsQuery,
    useGetUserIdQuery,
} from '@/api';
import { setSelectedChats, setSelectedMembers } from '@/api/state';
import type { GetTesteesResponse, SnackBarText, TaskType } from '@/app/types';
import { FooterWithButton, MembersNotFound } from '@/components';
import { ListContainer } from '@/components/ListContainer';
import { SnackBarMessage } from '@/components/SnackBarMessage';

import { MembersList } from './components';
import { LIMIT_MEMBERS, useMembersSelection } from '../hooks';

const maxTesteeItems = 205;

interface AddMembersPageProps {
    id?: string;
}

export const AddMembersPage: FC<AddMembersPageProps> = () => {
    const {
        route: {
            params: { collectionId },
        },
    } = useLocation();
    const dispatch = useDispatch();
    const router = useRouter();

    const { data: userId } = useGetUserIdQuery();

    const [snackbarText, setSnackbarText] = useState<SnackBarText>(null);
    const [timer, setTimer] = useState<NodeJS.Timeout>();

    const [conversationsCount, setConversationsCount] = useState(50);
    const [itemLength, setItemLength] = useState(0);

    const [search, setSearch] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [fixLayoutHeight, setFixLayoutHeight] = useState(0);
    const fixedLayoutRef = createRef<HTMLDivElement>();

    const { data: currentTask = {} as TaskType } = useGetTaskIdQuery({ taskId: collectionId });

    const { data = { taskResults: [] } } = useGetTaskResultsQuery({
        taskId: collectionId,
    });
    const { taskResults } = data;

    const invitedMemberIds = taskResults.map((result) => result.testee.vkUserId);

    const { data: testees = {} as GetTesteesResponse, isLoading } = useGetTesteesQuery(
        {
            search: searchQuery,
            count: conversationsCount,
            invitedMemberIds,
            userId: userId!,
        },
        { skip: !userId },
    );

    const selection = useMembersSelection();
    const { membersCount, selectedChats, selectedMembers } = selection;

    useEffect(() => {
        if (membersCount > LIMIT_MEMBERS) {
            setSnackbarText({ type: 'error', text: 'Лимит добавления пользователей превышен' });
        }
    }, [membersCount]);

    useEffect(() => {
        if (!isLoading && testees.profiles.length < maxTesteeItems) {
            setItemLength(testees.profiles.length);
        }
    }, [isLoading, testees]);

    useLayoutEffect(() => {
        const childNode: HTMLElement = fixedLayoutRef.current?.firstChild as HTMLElement;

        if (!childNode) {
            return;
        }

        setFixLayoutHeight(childNode.offsetHeight);
    }, [fixedLayoutRef]);

    const goBack = () => {
        router.popPage();
    };

    const changeSeacrh = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);

        clearTimeout(timer);

        const newTimer = setTimeout(() => {
            setSearchQuery(e.target.value);
        }, 500);

        setTimer(newTimer);
    };

    const onNextClick = () => {
        if (membersCount > LIMIT_MEMBERS) {
            return;
        }
        dispatch(setSelectedMembers(selectedMembers));
        dispatch(setSelectedChats(selectedChats));
        router.pushPage(PAGE_LIST_MEMBERS, { collectionId: currentTask.id });
    };

    return (
        <Panel
            id={PANEL_ADD_MEMBERS}
            data-automation-id='addMembers-page-panel'
        >
            <div ref={fixedLayoutRef}>
                <FixedLayout
                    filled
                    vertical='top'
                >
                    <PanelHeader
                        separator={false}
                        before={<PanelHeaderBack onClick={goBack} />}
                    >
                        {currentTask ? (
                            <PanelHeaderContent status={currentTask.name}>
                                Добавление участников
                            </PanelHeaderContent>
                        ) : (
                            <PanelHeaderSkeleton />
                        )}
                    </PanelHeader>

                    <Search
                        after=''
                        value={search}
                        onChange={changeSeacrh}
                    />
                </FixedLayout>
            </div>

            <ListContainer $fixedLayoutHeight={`${fixLayoutHeight}`}>
                <InfiniteScroll
                    hasMore
                    dataLength={itemLength}
                    next={() => setConversationsCount(conversationsCount + 50)}
                    scrollThreshold={0.7}
                    loader={false}
                >
                    <>
                        {!isLoading && testees.profiles.length > 0 ? (
                            <MembersList
                                selection={selection}
                                searchMembers={testees}
                            />
                        ) : (
                            <MembersNotFound />
                        )}
                    </>
                </InfiniteScroll>
            </ListContainer>

            {snackbarText && (
                <SnackBarMessage
                    isFooterOnPage
                    snackbarText={snackbarText}
                    setSnackbarText={setSnackbarText}
                />
            )}

            <FooterWithButton
                options={[
                    {
                        text: 'Продолжить',
                        disabled: !membersCount || membersCount > 50,
                        counter: membersCount,
                        counterLabel: `${membersCount} / 50`,
                        onClick: onNextClick,
                        loading: false,
                    },
                ]}
            />
        </Panel>
    );
};
