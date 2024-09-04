require('./vaultPage.less');

const React = require('react');
const { useState, useEffect, useRef } = React;

const Nav           = require('naturalcrit/nav/nav.jsx');
const Navbar        = require('../../navbar/navbar.jsx');
const RecentNavItem = require('../../navbar/recent.navitem.jsx').both;
const Account       = require('../../navbar/account.navitem.jsx');
const NewBrew       = require('../../navbar/newbrew.navitem.jsx');
const HelpNavItem   = require('../../navbar/help.navitem.jsx');
const BrewItem      = require('../basePages/listPage/brewItem/brewItem.jsx');
const SplitPane     = require('../../../../shared/naturalcrit/splitPane/splitPane.jsx');
const ErrorIndex    = require('../errorPage/errors/errorIndex.js');

const request = require('../../utils/request-middleware.js');

const VaultPage = (props)=>{
	const [pageState, setPageState] = useState(parseInt(props.query.page) || 1);

	//Response state
	const [brewCollection, setBrewCollection] = useState(null);
	const [totalBrews, setTotalBrews]         = useState(null);
	const [searching, setSearching]           = useState(false);
	const [error, setError]                   = useState(null);


	const titleRef        = useRef(null);
	const authorRef       = useRef(null);
	const countRef        = useRef(null);
	const v3Ref           = useRef(null);
	const legacyRef       = useRef(null);
	const submitButtonRef = useRef(null);

	useEffect(()=>{
		disableSubmitIfFormInvalid();
		loadPage(pageState, true);
	}, []);

	const updateStateWithBrews = (brews, page)=>{
		setBrewCollection(brews || null);
		setPageState(parseInt(page) || 1);
		setSearching(false);
	};

	const updateUrl = (titleValue, authorValue, countValue, v3Value, legacyValue, page)=>{
		const url = new URL(window.location.href);
		const urlParams = new URLSearchParams(url.search);

		urlParams.set('title', titleValue);
		urlParams.set('author', authorValue);
		urlParams.set('count', countValue);
		urlParams.set('v3', v3Value);
		urlParams.set('legacy', legacyValue);
		urlParams.set('page', page);

		url.search = urlParams.toString();
		window.history.replaceState(null, '', url.toString());
	};

	const performSearch = async (title, author, count, v3, legacy, page)=>{
		updateUrl(title, author, count, v3, legacy, page);

		const response = await request.get(
			`/api/vault?title=${title}&author=${author}&v3=${v3}&legacy=${legacy}&count=${count}&page=${page}`
		).catch((error)=>{
			console.log('error at loadPage: ', error);
			setError(error);
			updateStateWithBrews([], 1);
		});

		if(response.ok)
			updateStateWithBrews(response.body.brews, page);
	};

	const loadTotal = async (title, author, v3, legacy)=>{
		setTotalBrews(null);

		const response = await request.get(
			`/api/vault/total?title=${title}&author=${author}&v3=${v3}&legacy=${legacy}`
		).catch((error)=>{
			console.log('error at loadTotal: ', error);
			setError(error);
			updateStateWithBrews([], 1);
		});

		if(response.ok)
			setTotalBrews(response.body.totalBrews);
	};

	const loadPage = async (page, updateTotal)=>{
		if(!validateForm())
			return;

		setSearching(true);
		setError(null);

		const title  = titleRef.current.value || '';
		const author = authorRef.current.value || '';
		const count  = countRef.current.value || 10;
		const v3     = v3Ref.current.checked != false;
		const legacy = legacyRef.current.checked != false;

		performSearch(title, author, count, v3, legacy, page);

		if(updateTotal)
			loadTotal(title, author, v3, legacy);
	};

	const renderNavItems = ()=>(
		<Navbar>
			<Nav.section>
				<Nav.item className='brewTitle'>
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

	const validateForm = ()=>{
		//form validity: title or author must be written, and at least one renderer set
		const isTitleValid      = titleRef.current.validity.valid && titleRef.current.value;
		const isAuthorValid     = authorRef.current.validity.valid && authorRef.current.value;
		const isCheckboxChecked = legacyRef.current.checked || v3Ref.current.checked;

		const isFormValid = (isTitleValid || isAuthorValid) && isCheckboxChecked;

		return isFormValid;
	};

	const disableSubmitIfFormInvalid = ()=>{
		submitButtonRef.current.disabled = !validateForm();
	};

	const renderForm = ()=>(
		<div className='brewLookup'>
			<h2 className='formTitle'>Brew Lookup</h2>
			<div className='formContents'>
				<label>
					Title of the brew
					<input
						ref={titleRef}
						type='text'
						name='title'
						defaultValue={props.query.title || ''}
						onKeyUp={disableSubmitIfFormInvalid}
						pattern='.{3,}'
						title='At least 3 characters'
						onKeyDown={(e)=>{
							if(e.key === 'Enter' && !submitButtonRef.current.disabled)
								loadPage(1, true);
						}}
						placeholder='v3 Reference Document'
					/>
				</label>

				<label>
					Author of the brew
					<input
						ref={authorRef}
						type='text'
						name='author'
						pattern='.{1,}'
						defaultValue={props.query.author || ''}
						onKeyUp={disableSubmitIfFormInvalid}
						onKeyDown={(e)=>{
							if(e.key === 'Enter' && !submitButtonRef.current.disabled)
								loadPage(1, true);
						}}
						placeholder='Username'
					/>
				</label>

				<label>
					Results per page
					<select ref={countRef} name='count' defaultValue={props.query.count || 20}>
						<option value='10'>10</option>
						<option value='20'>20</option>
						<option value='40'>40</option>
						<option value='60'>60</option>
					</select>
				</label>

				<label>
					<input
						className='renderer'
						ref={v3Ref}
						type='checkbox'
						defaultChecked={props.query.v3 !== 'false'}
						onChange={disableSubmitIfFormInvalid}
					/>
					Search for v3 brews
				</label>

				<label>
					<input
						className='renderer'
						ref={legacyRef}
						type='checkbox'
						defaultChecked={props.query.legacy !== 'false'}
						onChange={disableSubmitIfFormInvalid}
					/>
					Search for legacy brews
				</label>

				<button
					id='searchButton'
					ref={submitButtonRef}
					onClick={()=>{
						loadPage(1, true);
					}}
				>
					Search
					<i
						className={searching ? 'fas fa-spin fa-spinner': 'fas fa-search'}
					/>
				</button>
			</div>
			<legend>
				<h3>Tips and tricks</h3>
				<ul>
					<li>
						Only <b>published</b> brews are searchable via this tool
					</li>
					<li>
						Usernames are case-sensitive
					</li>
					<li>
						Use <code>"word"</code> to match an exact string,
						and <code>-</code> to exclude words (at least one word must not be negated)
					</li>
					<li>
						Some common words like "a", "after", "through", "itself", "here", etc.,
						are ignored in searches. The full list can be found &nbsp;
						<a href='https://github.com/mongodb/mongo/blob/0e3b3ca8480ddddf5d0105d11a94bd4698335312/src/mongo/db/fts/stop_words_english.txt'>
							here
						</a>
					</li>
				</ul>
			</legend>
		</div>
	);

	const renderPaginationControls = ()=>{
		if(!totalBrews) return null;

		const countInt = parseInt(props.query.count || 20);
		const totalPages = Math.ceil(totalBrews / countInt);

		let startPage, endPage;
		if(pageState <= 6) {
			startPage = 1;
			endPage = Math.min(totalPages, 10);
		} else if(pageState + 4 >= totalPages) {
			startPage = Math.max(1, totalPages - 9);
			endPage = totalPages;
		} else {
			startPage = pageState - 5;
			endPage = pageState + 4;
		}

		const pagesAroundCurrent = new Array(endPage - startPage + 1)
			.fill()
			.map((_, index)=>(
				<a
					key={startPage + index}
					className={`pageNumber ${
						pageState === startPage + index ? 'currentPage' : ''
					}`}
					onClick={()=>loadPage(startPage + index, false)}
				>
					{startPage + index}
				</a>
			));

		return (
			<div className='paginationControls'>
				<button
					className='previousPage'
					onClick={()=>loadPage(pageState - 1, false)}
					disabled={pageState === startPage}
				>
					<i className='fa-solid fa-chevron-left'></i>
				</button>
				<ol className='pages'>
					{startPage > 1 && (
						<a
							className='pageNumber firstPage'
							onClick={()=>loadPage(1, false)}
						>
							1 ...
						</a>
					)}
					{pagesAroundCurrent}
					{endPage < totalPages && (
						<a
							className='pageNumber lastPage'
							onClick={()=>loadPage(totalPages, false)}
						>
							... {totalPages}
						</a>
					)}
				</ol>
				<button
					className='nextPage'
					onClick={()=>loadPage(pageState + 1, false)}
					disabled={pageState === totalPages}
				>
					<i className='fa-solid fa-chevron-right'></i>
				</button>
			</div>
		);
	};

	const renderFoundBrews = ()=>{
		if(searching) {
			return (
				<div className='foundBrews searching'>
					<h3 className='searchAnim'>Searching</h3>
				</div>
			);
		}

		if(error) {
			const errorText = ErrorIndex()[error.HBErrorCode.toString()] || '';
			
			return (
				<div className='foundBrews noBrews'>
					<h3>Error: {errorText}</h3>
				</div>
			);
		}

		if(!brewCollection) {
			return (
				<div className='foundBrews noBrews'>
					<h3>No search yet</h3>
				</div>
			);
		}

		if(brewCollection.length === 0) {
			return (
				<div className='foundBrews noBrews'>
					<h3>No brews found</h3>
				</div>
			);
		}

		return (
			<div className='foundBrews'>
				<span className='totalBrews'>
					{`Brews found: `}
					<span>{totalBrews}</span>
				</span>
				{brewCollection.map((brew, index)=>{
					return (
						<BrewItem
							brew={{ ...brew }}
							key={index}
							reportError={props.reportError}
							dontRenderStorage
						/>
					);
				})}
				{renderPaginationControls()}
			</div>
		);
	};

	return (
		<div className='vaultPage'>
			<link href='/themes/V3/Blank/style.css' rel='stylesheet' />
			<link href='/themes/V3/5ePHB/style.css' rel='stylesheet' />
			{renderNavItems()}
			<div className='content'>
				<SplitPane hideMoveArrows>
					<div className='form dataGroup'>{renderForm()}</div>

					<div className='resultsContainer dataGroup'>
						{renderFoundBrews()}
					</div>
				</SplitPane>
			</div>
		</div>
	);
};

module.exports = VaultPage;
