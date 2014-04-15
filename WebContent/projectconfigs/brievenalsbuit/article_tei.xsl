<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:tei="http://www.tei-c.org/ns/1.0" exclude-result-prefixes="tei">
	<xsl:output encoding="utf-8" method="html" omit-xml-declaration="yes" />
	<xsl:param name="title_name" select="'#'"/>
	<xsl:param name="source_images" select="''"/>

	<xsl:template match="error">
		<h1>Error</h1>
		<xsl:value-of select="." />
	</xsl:template>
	
	<xsl:template match="SearchSummary" />
	
	<xsl:template match="HitsInDocument">	
	</xsl:template>
	
	<xsl:template match="DocumentFields">
		<xsl:variable name="numhits" select="../HitsInDocument" />
		<div class="span12 contentbox">
			<h2>
				<xsl:value-of select="*[name()=$title_name]" />
			</h2>
			<div class="span10">
				<div class="span2">
					<i>Hits in document:</i>
				</div>
				<div class="span7">
					<xsl:value-of select="$numhits" />
				</div>
			</div>
			<div class="span10">
				<b>Letter</b>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Year</i>
				</div>
				<div class="span6">
					<xsl:value-of select="datum_jaar" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Text type</i>
				</div>
				<div class="span6">
					<xsl:value-of select="type_brief" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Autograph</i>
				</div>
				<div class="span6">
					<xsl:value-of select="autograaf" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Signature</i>
				</div>
				<div class="span6">
					<xsl:value-of select="signatuur" />
				</div>
			</div>
			<div class="span10">
				<b>Sender</b>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Name</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_naam_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Gender</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_geslacht" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Class</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_klasse" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Age</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_geb_lftcat" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Region of residence</i>
				</div>
				<div class="span6">
					<xsl:value-of select="regiocode" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Relationship to addressee</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_rel_tot_adr" />
				</div>
			</div>
			<div class="span10">
				<b>Addressee</b>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Name</i>
				</div>
				<div class="span6">
					<xsl:value-of select="adr_naam_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Place</i>
				</div>
				<div class="span6">
					<xsl:value-of select="adr_loc_plaats_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Country</i>
				</div>
				<div class="span6">
					<xsl:value-of select="adr_loc_land_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Region</i>
				</div>
				<div class="span6">
					<xsl:value-of select="adr_loc_regio_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Ship</i>
				</div>
				<div class="span6">
					<xsl:value-of select="adr_loc_schip_norm" />
				</div>
			</div>
			<div class="span10">
				<b>Sent from</b>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Place</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_loc_plaats_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Country</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_loc_land_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Region</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_loc_regio_norm" />
				</div>
			</div>
			<div class="span10">
				<div class="span2">
					<i>Ship</i>
				</div>
				<div class="span6">
					<xsl:value-of select="afz_loc_schip_norm" />
				</div>
			</div>
		</div>
	</xsl:template>
	
	<xsl:template match="teiHeader" />
	
	<xsl:template match="body">
		<div class="span12 contentbox">
			<ul class="nav nav-tabs" id="articletabs">
				<li class="active">
					<a href="#text" data-toggle="tab">Text</a>
				</li>
				<xsl:if test="$source_images != ''">
				<li>
					<a href="#images" data-toggle="tab">Images</a>
				</li>
				</xsl:if>
			</ul>
			
			<div class="tab-content">
				<div class="tab-pane active" id="text">
					<xsl:apply-templates />
				</div>
				<xsl:if test="$source_images != ''">
				<div class="tab-pane" id="images">
					<xsl:for-each select="//interpGrp[@type='images']">
						<xsl:for-each select=".//interp">
							<img class="img-polaroid"><xsl:attribute name="src"><xsl:value-of select="$source_images"/><xsl:value-of select="./@value"/></xsl:attribute></img>
							<br/>
						</xsl:for-each>
					</xsl:for-each>
				</div>
				</xsl:if>
			</div>			
		</div>
	</xsl:template>
	
	<xsl:template match="p|tei:p">
		<p>
			<xsl:apply-templates />
		</p>
	</xsl:template>
	
	<xsl:template match="lb|tei:lb">
		<br/>
		
		<xsl:variable name="number" select="@n" />
		<xsl:if test="$number">
			<span class="linenumber"><xsl:value-of select="$number" /></span>
		</xsl:if>
	</xsl:template>
	
  	<xsl:template match="w|tei:w">
		<xsl:variable name="lemma" select="@lemma" />
		<span class="word" ref="tooltip">
			<xsl:attribute name="title">
				<xsl:value-of select="$lemma" />
			</xsl:attribute>
			<xsl:value-of select="." />
		</span>
		<xsl:text> </xsl:text>
	</xsl:template>

	<xsl:template match="del|tei:del">
	<span style="text-decoration:line-through"><xsl:apply-templates/></span>
	</xsl:template>  

  	<xsl:template match="hl|tei:hl">
		<a>
			<xsl:attribute name="name">
				<xsl:value-of select="generate-id()" />
			</xsl:attribute>
			<xsl:attribute name="class">anchor hl</xsl:attribute>
			<xsl:apply-templates />
		</a>
	</xsl:template>
	
</xsl:stylesheet>