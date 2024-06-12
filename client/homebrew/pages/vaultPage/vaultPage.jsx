require('./vaultPage.less');

const React = require('react');
const { useState, useEffect, useRef } = React;
const cx = require('classnames');

const Nav = require('naturalcrit/nav/nav.jsx');
const Navbar = require('../../navbar/navbar.jsx');
const RecentNavItem = require('../../navbar/recent.navitem.jsx').both;
const Account = require('../../navbar/account.navitem.jsx');
const NewBrew = require('../../navbar/newbrew.navitem.jsx');
const HelpNavItem = require('../../navbar/help.navitem.jsx');
const BrewItem = require('../basePages/listPage/brewItem/brewItem.jsx');

const request = require('../../utils/request-middleware.js');

const VaultPage = (props) => {
    const [title, setTitle] = useState(props.query.title || '');
    const [legacy, setLegacy] = useState(props.query.legacy !== 'false');
    const [v3, setV3] = useState(props.query.v3 !== 'false');
    const [count, setCount] = useState(props.query.count || 10);
    const [page, setPage] = useState(parseInt(props.query.page) || 1);
    const [brewCollection, setBrewCollection] = useState(null);
    const [totalBrews, setTotalBrews] = useState(null);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);

    const titleRef = useRef(null);
    const countRef = useRef(null);
    const v3Ref = useRef(null);
    const legacyRef = useRef(null);

    useEffect(() => {
        validateInput();
        if (title) {
            loadPage(page, false, true);
        }
    }, []);

    const updateStateWithBrews = (brews, page) => {
        setBrewCollection(brews || null);
        setPage(parseInt(page) || 1);
        setSearching(false);
    };

    const updateUrl = (title, page, count, v3, legacy) => {
        const url = new URL(window.location.href);
        const urlParams = new URLSearchParams();

        Object.entries({ title, page, count, v3, legacy }).forEach(
            ([key, value]) => urlParams.set(key, value)
        );

        url.search = urlParams.toString();
        window.history.replaceState(null, null, url);
    };

    const loadPage = async (page, update, total) => {
        setSearching(true);
        setError(null);

        const performSearch = async ({ title, count, v3, legacy }) => {
            updateUrl(title, page, count, v3, legacy);
            if (title !== '') {
                try {
                    const response = await request.get(
                        `/api/vault?title=${title}&page=${page}&count=${count}&v3=${v3}&legacy=${legacy}`
                    );
                    if (response.ok) {
                        updateStateWithBrews(response.body.brews, page);
                    } else {
                        throw new Error(`Error: ${response.status}`);
                    }
                } catch (error) {
                    console.log('error at loadPage: ', error);
                    setError(
                        `${
                            error.response
                                ? error.response.status
                                : error.message
                        }`
                    );
                    updateStateWithBrews([], 1);
                }
            } else {
                setError('404');
            }
        };

        const loadTotal = async ({title, v3, legacy}) => {
            setTotalBrews(null);
            setError(null);
            if (title) {
                try {
                    const response = await request.get(
                        `/api/vault/total?title=${title}&v3=${v3}&legacy=${legacy}`
                    );

                    if (response.ok) {
                        setTotalBrews(response.body.totalBrews);
                    } else {
                        throw new Error(
                            `Failed to load total brews: ${response.statusText}`
                        );
                    }
                } catch (error) {
                    console.log('error at loadTotal: ', error);
                    setError(`${error.response.status}`);
                    updateStateWithBrews([], 1);
                }
            }
        };

        const title = titleRef.current.value || '';
        const count = countRef.current.value || 10;
        const v3 = v3Ref.current.checked;
        const legacy = legacyRef.current.checked;

        if (update) {
            setTitle(title);
            setCount(count);
            setV3(v3);
            setLegacy(legacy);

            performSearch({ title, count, v3, legacy });
        } else {
            performSearch({ title, count, v3, legacy });
        }

        if (total) {
            loadTotal({ title, v3, legacy });
        }
    };

    const renderNavItems = () => (
        <Navbar>
            <Nav.section>
                <Nav.item className="brewTitle">
                    Vault: Search for brews
                </Nav.item>
            </Nav.section>
            <Nav.section>
                <NewBrew />
                <HelpNavItem />
                <RecentNavItem />
                <Account />
            </Nav.section>
        </Navbar>
    );

    const validateInput = () => {
        const textInput = titleRef.current;
        const submitButton = document.getElementById('searchButton');
        if (textInput.validity.valid && textInput.value) {
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    };

    const renderForm = () => (
        <div className="brewLookup">
            <h2 className="formTitle">Brew Lookup</h2>
            <div className="formContents">
                <label>
                    Title of the brew
                    <input
                        ref={titleRef}
                        type="text"
                        name="title"
                        defaultValue={title}
                        onKeyUp={validateInput}
                        pattern=".{3,}"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (e.target.validity.valid && e.target.value) {
                                    loadPage(1, true, true);
                                }
                            }
                        }}
                        placeholder="v3 Reference Document"
                    />
                </label>
                <small>
                    Tip! you can use <code>-</code> to negate words, and{' '}
                    <code>"word"</code> to specify an exact string.
                </small>
                <label>
                    Results per page
                    <select ref={countRef} name="count" defaultValue={count}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="40">40</option>
                        <option value="60">60</option>
                    </select>
                </label>

                <label>
                    <input ref={v3Ref} type="checkbox" defaultChecked={v3} />
                    Search for v3 brews
                </label>

                <label>
                    <input
                        ref={legacyRef}
                        type="checkbox"
                        defaultChecked={legacy}
                    />
                    Search for legacy brews
                </label>

                <button
                    id="searchButton"
                    onClick={() => {
                        loadPage(1, true, true);
                    }}
                >
                    Search
                    <i
                        className={cx('fas', {
                            'fa-search': !searching,
                            'fa-spin fa-spinner': searching,
                        })}
                    />
                </button>
            </div>
            <small>
                Remember, you can only search brews with this tool if they are
                published
            </small>
        </div>
    );

    const renderPaginationControls = () => {
        if (!totalBrews) return null;

        const countInt = parseInt(count);
        const totalPages = Math.ceil(totalBrews / countInt);

        let startPage, endPage;
        if (page <= 6) {
            startPage = 1;
            endPage = Math.min(totalPages, 10);
        } else if (page + 4 >= totalPages) {
            startPage = Math.max(1, totalPages - 9);
            endPage = totalPages;
        } else {
            startPage = page - 5;
            endPage = page + 4;
        }

        const pagesAroundCurrent = new Array(endPage - startPage + 1)
            .fill()
            .map((_, index) => (
                <a
                    key={startPage + index}
                    className={`pageNumber ${
                        page === startPage + index ? 'currentPage' : ''
                    }`}
                    onClick={() => loadPage(startPage + index, false)}
                >
                    {startPage + index}
                </a>
            ));

        return (
            <div className="paginationControls">
                {page > 1 && (
                    <button
                        className="previousPage"
                        onClick={() => loadPage(page - 1, false)}
                    >
                        &lt;&lt;
                    </button>
                )}
                <ol className="pages">
                    {startPage > 1 && (
                        <a
                            className="firstPage"
                            onClick={() => loadPage(1, false)}
                        >
                            1 ...
                        </a>
                    )}
                    {pagesAroundCurrent}
                    {endPage < totalPages && (
                        <a
                            className="lastPage"
                            onClick={() => loadPage(totalPages, false)}
                        >
                            ... {totalPages}
                        </a>
                    )}
                </ol>
                {page < totalPages && (
                    <button
                        className="nextPage"
                        onClick={() => loadPage(page + 1, false)}
                    >
                        &gt;&gt;
                    </button>
                )}
            </div>
        );
    };

    const renderFoundBrews = () => {
        if (searching) {
            return (
                <div className="foundBrews searching">
                    <h3 className="searchAnim">Searching</h3>
                </div>
            );
        }

        if (title === '') {
            return (
                <div className="foundBrews noBrews">
                    <h3>No search yet</h3>
                </div>
            );
        }

        if (error) {
            console.log('render Error: ', error);
            let errorMessage;
            switch (error.errorCode) {
                case '404':
                    errorMessage = "404 - We didn't find any brew";
                    break;
                case '503':
                    errorMessage =
                        '503 - Service Unavailable, try again later, sorry.';
                    break;
                case '500':
                    errorMessage =
                        "500 - We don't know what happened, go ahead and contact the mods or report as a mistake.";
                    break;
                default:
                    errorMessage = 'An unexpected error occurred';
            }

            return (
                <div className="foundBrews noBrews">
                    <h3>Error: {errorMessage}</h3>
                </div>
            );
        }

        if (!brewCollection || brewCollection.length === 0) {
            return (
                <div className="foundBrews noBrews">
                    <h3>No brews found</h3>
                </div>
            );
        }

        return (
            <div className="foundBrews">
                <span className="totalBrews">
                    {`Brews found: `}
                    <span>{totalBrews}</span>
                </span>
                {brewCollection.map((brew, index) => (
                    <BrewItem
                        brew={brew}
                        key={index}
                        reportError={props.reportError}
                    />
                ))}
                {renderPaginationControls()}
            </div>
        );
    };

    return (
        <div className="vaultPage">
            <link href="/themes/V3/Blank/style.css" rel="stylesheet" />
            <link href="/themes/V3/5ePHB/style.css" rel="stylesheet" />
            {renderNavItems()}
            <div className="content">
                <div className="form dataGroup">{renderForm()}</div>

                <div className="resultsContainer dataGroup">
                    {renderFoundBrews()}
                </div>
            </div>
        </div>
    );
};

module.exports = VaultPage;
