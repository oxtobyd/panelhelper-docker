--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8 (Homebrew)
-- Dumped by pg_dump version 15.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: calculate_season(date); Type: FUNCTION; Schema: public; Owner: davidoxtoby
--

CREATE FUNCTION public.calculate_season(panel_date date) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXTRACT(MONTH FROM panel_date) >= 9 THEN
        RETURN CONCAT(
            EXTRACT(YEAR FROM panel_date)::TEXT, 
            '/', 
            (EXTRACT(YEAR FROM panel_date) + 1)::TEXT
        );
    ELSE
        RETURN CONCAT(
            (EXTRACT(YEAR FROM panel_date) - 1)::TEXT,
            '/',
            EXTRACT(YEAR FROM panel_date)::TEXT
        );
    END IF;
END;
$$;


ALTER FUNCTION public.calculate_season(panel_date date) OWNER TO davidoxtoby;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: additional_desired_focus; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.additional_desired_focus (
    mdsid bigint NOT NULL,
    portal_id uuid,
    legal_forename character varying(100),
    legal_middle_names character varying(100),
    legal_surname character varying(100),
    order_of_ministry character varying(50),
    focus_of_ministry character varying(50),
    additional_desired_focus text
);


ALTER TABLE public.additional_desired_focus OWNER TO davidoxtoby;

--
-- Name: advisers; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.advisers (
    id bigint NOT NULL,
    create_date timestamp without time zone,
    active boolean,
    diocese_id bigint,
    title character varying(50),
    forenames character varying(100),
    surname character varying(100),
    date_of_birth date,
    hometel character varying(20),
    worktel character varying(20),
    email character varying(100),
    diocese character varying(100),
    gender character(1),
    portal_id uuid,
    p_lay boolean,
    p_ordained boolean,
    p_safeguarding_training boolean,
    p_stage1_training boolean,
    p_stage2_training boolean,
    p_diocese_id bigint,
    p_max_carousels integer,
    p_gender character(1),
    p_female boolean,
    p_male boolean,
    p_max_panels integer,
    p_mfa boolean,
    p_pfa boolean,
    p_total_dates_selected integer,
    current_carousel_count integer,
    current_panel_count integer,
    available_to_allocate boolean,
    available_to_allocate_panels boolean,
    total_panel_dates_selected integer,
    p_total_carousel_dates_confirmed integer,
    p_total_panel_dates_confirmed integer,
    is_ddo boolean,
    is_addo boolean
);


ALTER TABLE public.advisers OWNER TO davidoxtoby;

--
-- Name: candidates; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.candidates (
    id bigint NOT NULL,
    create_date timestamp without time zone,
    portal_id uuid,
    active boolean,
    status integer,
    portal_carousel_stage integer,
    last_status_change_date timestamp without time zone,
    candidate_no character varying(50),
    email character varying(100),
    pbid integer,
    diocese bigint,
    title character varying(50),
    forenames character varying(100),
    surname character varying(100),
    preferred_forename character varying(100),
    preferred_surname character varying(100),
    date_of_birth date,
    gender character varying(10),
    telephone_number character varying(20),
    mobile_number character varying(20),
    contact_aado character varying(100),
    sponsoring_bishop character varying(100),
    sponsored_ministry character varying(100),
    pb_diocese character varying(100),
    season character varying(10),
    status_id bigint,
    pun character varying(50),
    carousel_season character varying(10),
    carousel_name character varying(50),
    carousel_feedback boolean,
    panel_season character varying(10),
    panel_name character varying(50),
    panel_recommendation boolean,
    disabled_in_portal boolean,
    patid_cc bigint,
    patid_pl bigint,
    training_status integer,
    last_interaction_date timestamp without time zone
);


ALTER TABLE public.candidates OWNER TO davidoxtoby;

--
-- Name: cc_outcomes; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.cc_outcomes (
    id bigint NOT NULL,
    candidate_id bigint,
    portal_candidate_id uuid,
    status character(1),
    created_date timestamp without time zone,
    edited_date timestamp without time zone,
    national_adviser_name character varying(100),
    completed_date date,
    available_date timestamp without time zone,
    created_user integer,
    cc1_value integer,
    cc2_value integer,
    cc3_value integer,
    cc4_value integer,
    cc5_value integer,
    cc6_value integer,
    sccc1_text text,
    sccc2_text text,
    sccc3_text text,
    sccc4_text text,
    sccc5_text text,
    sccc6_text text,
    sc_summary_text text,
    panel_attendees_id bigint
);


ALTER TABLE public.cc_outcomes OWNER TO davidoxtoby;

--
-- Name: diocese; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.diocese (
    id bigint NOT NULL,
    parent_diocese_id bigint,
    diocese_name character varying(100)
);


ALTER TABLE public.diocese OWNER TO davidoxtoby;

--
-- Name: import_history; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.import_history (
    id integer NOT NULL,
    import_type character varying(50) NOT NULL,
    filename character varying(255) NOT NULL,
    imported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    success boolean NOT NULL
);


ALTER TABLE public.import_history OWNER TO davidoxtoby;

--
-- Name: import_history_id_seq; Type: SEQUENCE; Schema: public; Owner: davidoxtoby
--

CREATE SEQUENCE public.import_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_history_id_seq OWNER TO davidoxtoby;

--
-- Name: import_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: davidoxtoby
--

ALTER SEQUENCE public.import_history_id_seq OWNED BY public.import_history.id;


--
-- Name: list_values; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.list_values (
    id bigint NOT NULL,
    list_group character varying(255),
    label_description character varying(255),
    list_code character varying(255),
    order_key integer,
    in_use boolean,
    ref_data1 character varying(255),
    select_bitwise01 integer,
    check_select boolean
);


ALTER TABLE public.list_values OWNER TO davidoxtoby;

--
-- Name: panel_attendees; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.panel_attendees (
    id bigint NOT NULL,
    created_date timestamp without time zone,
    created_by integer,
    panel_id bigint,
    attendee_id bigint,
    attendee_type character(1),
    attendee_diocese_id bigint,
    attendee_gender character(1),
    attendee_team character varying(50),
    season character varying(10),
    last_updated_date timestamp without time zone,
    batch_id character varying(50),
    attendance_request_id character varying(50),
    mfa_or_pfa character varying(10),
    mp1_or_2 character varying(10)
);


ALTER TABLE public.panel_attendees OWNER TO davidoxtoby;

--
-- Name: panel_outcomes; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.panel_outcomes (
    id integer NOT NULL,
    candidate_name character varying(255),
    diocese_name character varying(255),
    national_adviser_name character varying(255),
    completed_date date,
    love_for_god integer,
    call_to_ministry integer,
    love_for_people integer,
    wisdom integer,
    fruitfulness integer,
    potential integer,
    panel_result_text text,
    panel_name character varying(50),
    raw_season integer,
    calculated_season character varying(9),
    bishops_decision character varying(255),
    bishops_note text,
    candidate_id bigint,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.panel_outcomes OWNER TO davidoxtoby;

--
-- Name: panel_outcomes_id_seq; Type: SEQUENCE; Schema: public; Owner: davidoxtoby
--

CREATE SEQUENCE public.panel_outcomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.panel_outcomes_id_seq OWNER TO davidoxtoby;

--
-- Name: panel_outcomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: davidoxtoby
--

ALTER SEQUENCE public.panel_outcomes_id_seq OWNED BY public.panel_outcomes.id;


--
-- Name: panel_secretaries; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.panel_secretaries (
    id bigint NOT NULL,
    user_id integer,
    active boolean,
    initials character varying(10),
    name character varying(100),
    tel character varying(20),
    email character varying(100),
    forenames character varying(100),
    surname character varying(100)
);


ALTER TABLE public.panel_secretaries OWNER TO davidoxtoby;

--
-- Name: panel_venues; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.panel_venues (
    id bigint NOT NULL,
    active boolean,
    code character varying(50),
    name character varying(100),
    add1 character varying(100),
    add2 character varying(100),
    add3 character varying(100),
    postcode character varying(20),
    tel character varying(20),
    venue_url character varying(200),
    default_adviser_count integer,
    default_candidate_count integer,
    include boolean,
    create_date timestamp without time zone,
    created_by integer,
    status character(1)
);


ALTER TABLE public.panel_venues OWNER TO davidoxtoby;

--
-- Name: panels; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.panels (
    id bigint NOT NULL,
    created_date timestamp without time zone,
    created_by integer,
    last_edited_by integer,
    panel_status integer,
    panel_type character varying(50),
    panel_name character varying(50),
    panel_date date,
    panel_time time without time zone,
    panel_adviser_number integer,
    panel_candidate_number integer,
    venue_id bigint,
    feedback_date date,
    feedback_time time without time zone,
    season character varying(10),
    portal_ref uuid,
    available_to_select boolean,
    dst_member integer,
    half_panel character(1)
);


ALTER TABLE public.panels OWNER TO davidoxtoby;

--
-- Name: panels_with_season; Type: VIEW; Schema: public; Owner: davidoxtoby
--

CREATE VIEW public.panels_with_season AS
 SELECT panels.id,
    panels.created_date,
    panels.created_by,
    panels.last_edited_by,
    panels.panel_status,
    panels.panel_type,
    panels.panel_name,
    panels.panel_date,
    panels.panel_time,
    panels.panel_adviser_number,
    panels.panel_candidate_number,
    panels.venue_id,
    panels.feedback_date,
    panels.feedback_time,
    panels.season,
    panels.portal_ref,
    panels.available_to_select,
    panels.dst_member,
    panels.half_panel,
    public.calculate_season(panels.panel_date) AS calculated_season
   FROM public.panels;


ALTER TABLE public.panels_with_season OWNER TO davidoxtoby;

--
-- Name: parent_diocese; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.parent_diocese (
    id bigint NOT NULL,
    diocese_number integer,
    parent_diocese_name character varying(100),
    diocese_province character varying(100),
    diocese_cathedral character varying(100),
    pb_diocese_id integer,
    in_use boolean
);


ALTER TABLE public.parent_diocese OWNER TO davidoxtoby;

--
-- Name: pl_recommendations; Type: TABLE; Schema: public; Owner: davidoxtoby
--

CREATE TABLE public.pl_recommendations (
    id bigint NOT NULL,
    candidate_id bigint,
    portal_candidate_id uuid,
    status character(1),
    created_date timestamp without time zone,
    edited_date timestamp without time zone,
    national_adviser_name character varying(100),
    completed_date date,
    available_date timestamp without time zone,
    created_user integer,
    love_for_god integer,
    call_to_ministry integer,
    love_for_people integer,
    wisdom integer,
    fruitfulness integer,
    potential integer,
    panel_result_text text,
    panel_id bigint,
    bishops_decision character varying(50)
);


ALTER TABLE public.pl_recommendations OWNER TO davidoxtoby;

--
-- Name: import_history id; Type: DEFAULT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.import_history ALTER COLUMN id SET DEFAULT nextval('public.import_history_id_seq'::regclass);


--
-- Name: panel_outcomes id; Type: DEFAULT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panel_outcomes ALTER COLUMN id SET DEFAULT nextval('public.panel_outcomes_id_seq'::regclass);


--
-- Name: additional_desired_focus additional_desired_focus_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.additional_desired_focus
    ADD CONSTRAINT additional_desired_focus_pkey PRIMARY KEY (mdsid);


--
-- Name: advisers advisers_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.advisers
    ADD CONSTRAINT advisers_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: cc_outcomes cc_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.cc_outcomes
    ADD CONSTRAINT cc_outcomes_pkey PRIMARY KEY (id);


--
-- Name: diocese diocese_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.diocese
    ADD CONSTRAINT diocese_pkey PRIMARY KEY (id);


--
-- Name: import_history import_history_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_pkey PRIMARY KEY (id);


--
-- Name: list_values list_values_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.list_values
    ADD CONSTRAINT list_values_pkey PRIMARY KEY (id);


--
-- Name: panel_attendees panel_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panel_attendees
    ADD CONSTRAINT panel_attendees_pkey PRIMARY KEY (id);


--
-- Name: parent_diocese panel_diocese_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.parent_diocese
    ADD CONSTRAINT panel_diocese_pkey PRIMARY KEY (id);


--
-- Name: panel_outcomes panel_outcomes_candidate_id_panel_name_key; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panel_outcomes
    ADD CONSTRAINT panel_outcomes_candidate_id_panel_name_key UNIQUE (candidate_id, panel_name);


--
-- Name: panel_outcomes panel_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panel_outcomes
    ADD CONSTRAINT panel_outcomes_pkey PRIMARY KEY (id);


--
-- Name: panel_secretaries panel_secretaries_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panel_secretaries
    ADD CONSTRAINT panel_secretaries_pkey PRIMARY KEY (id);


--
-- Name: panel_venues panel_venues_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panel_venues
    ADD CONSTRAINT panel_venues_pkey PRIMARY KEY (id);


--
-- Name: panels panels_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.panels
    ADD CONSTRAINT panels_pkey PRIMARY KEY (id);


--
-- Name: pl_recommendations pl_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: davidoxtoby
--

ALTER TABLE ONLY public.pl_recommendations
    ADD CONSTRAINT pl_recommendations_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

